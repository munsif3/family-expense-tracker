import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Transaction, Category } from '@/types';
import { budgetService } from '@/lib/api/budgets';
import { getYear, getMonth } from 'date-fns';

export interface BudgetStatusItem {
    name: string;
    id: string | undefined;
    spent: number;
    budgetAnnual: number;
    percent: number;
    color: string;
}

export interface MonthlyStatusItem {
    monthIndex: number; // 0-11
    monthName: string;
    spent: number;
    budget: number;
    items: BudgetStatusItem[];
}

export function useBudget() {
    const { profile, household } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [localBudgets, setLocalBudgets] = useState<Record<string, string | number>>({});
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const currency = household?.currency || 'USD';

    // Fetch Transactions
    useEffect(() => {
        if (!profile?.householdId) return;

        // Optimization: In a real app with many years of data, we would filter by date range in Firestore.
        // For now, fetching all expense transactions and filtering in memory is acceptable for small/medium usage.
        const q = query(
            collection(db, 'transactions'),
            where('householdId', '==', profile.householdId),
            where('type', '==', 'expense')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    ...d,
                    // Ensure date is a proper wrapper if needed, but Firestore SDK usually handles Timestamp to JS Date via toDate()
                    // However, we receive Timestamp objects here.
                };
            }) as Transaction[];
            setTransactions(data);
        });
        return () => unsubscribe();
    }, [profile?.householdId]);

    // Fetch Categories & Seed if Empty
    useEffect(() => {
        if (!profile?.householdId) return;

        const q = query(
            collection(db, 'categories'),
            where('householdId', '==', profile.householdId)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                // Seed default categories
                setLoading(true);
                const { CATEGORIES } = await import('@/lib/constants');
                const batchPromises = CATEGORIES
                    .filter(c => c.type === 'expense')
                    .map(c => {
                        return setDoc(doc(db, 'categories', c.id), {
                            ...c,
                            householdId: profile.householdId,
                            color: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color for now
                            budgetMonthly: 0
                        });
                    });

                try {
                    await Promise.all(batchPromises);
                } catch (err) {
                    console.error("Failed to seed categories", err);
                    setLoading(false);
                }
            } else {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Category[];
                setCategories(data);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [profile?.householdId]);

    // Calculate Status
    const { budgetStatus, monthlyStatus } = useMemo(() => {
        // Filter transactions for the selected year
        const yearTransactions = transactions.filter(t => {
            const date = t.date?.toDate?.() || new Date(t.date as any); // Handle Firestore Timestamp
            return getYear(date) === selectedYear;
        });

        // 1. Calculate Summary (Annual) Status
        // Aggregates all transactions for the selected year by category.
        // Compares total spent vs (Monthly Budget * 12).
        const annualSpendMap: Record<string, number> = {};
        yearTransactions.forEach(t => {
            const name = t.categoryName || 'Other';
            annualSpendMap[name] = (annualSpendMap[name] || 0) + t.amount;
        });

        const allNames = new Set([...Object.keys(annualSpendMap), ...categories.map(c => c.name)]);

        const annualStatus = Array.from(allNames).map((name): BudgetStatusItem => {
            const cat = categories.find(c => c.name === name);
            const spent = annualSpendMap[name] || 0;

            // Get monthly budget: check year override first, then fall back to default
            let budgetMonthly = cat?.budgets?.[selectedYear] ?? cat?.budgetMonthly ?? 0;

            const budgetAnnual = budgetMonthly * 12;
            const percent = budgetAnnual > 0 ? (spent / budgetAnnual) * 100 : (spent > 0 ? 100 : 0);

            return {
                name,
                id: cat?.id,
                spent,
                budgetAnnual,
                percent,
                color: cat?.color || '#cbd5e1'
            };
        }).sort((a, b) => b.spent - a.spent);

        // 2. Calculate Monthly Status
        // Breaks down spending month-by-month for trend analysis.
        const months = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(selectedYear, i, 1);
            return {
                index: i,
                name: date.toLocaleString('default', { month: 'long' })
            };
        });

        const monthlyData = months.map(({ index, name: monthName }): MonthlyStatusItem => {
            // Filter transactions for this month
            const monthTransactions = yearTransactions.filter(t => {
                const date = t.date?.toDate?.() || new Date(t.date as any);
                return getMonth(date) === index;
            });

            const monthSpendMap: Record<string, number> = {};
            let totalSpent = 0;
            monthTransactions.forEach(t => {
                const catName = t.categoryName || 'Other';
                monthSpendMap[catName] = (monthSpendMap[catName] || 0) + t.amount;
                totalSpent += t.amount;
            });

            const items = Array.from(allNames).map((name): BudgetStatusItem => {
                const cat = categories.find(c => c.name === name);
                const spent = monthSpendMap[name] || 0;

                // Monthly budget for this category
                const budgetMonthly = cat?.budgets?.[selectedYear] ?? cat?.budgetMonthly ?? 0;
                const percent = budgetMonthly > 0 ? (spent / budgetMonthly) * 100 : (spent > 0 ? 100 : 0);

                return {
                    name,
                    id: cat?.id,
                    spent,
                    budgetAnnual: budgetMonthly, // Reusing field name for monthly budget in this context
                    percent,
                    color: cat?.color || '#cbd5e1'
                };
            }).sort((a, b) => b.spent - a.spent);

            // Calculate total budget for the month (sum of all category budgets)
            const totalBudget = categories.reduce((acc, cat) => {
                return acc + (cat?.budgets?.[selectedYear] ?? cat?.budgetMonthly ?? 0);
            }, 0);

            return {
                monthIndex: index,
                monthName,
                spent: totalSpent,
                budget: totalBudget,
                items
            };
        });

        return { budgetStatus: annualStatus, monthlyStatus: monthlyData };
    }, [transactions, categories, selectedYear]);

    const handleSaveBudgets = async (): Promise<boolean> => {
        if (!profile?.uid) return false;

        try {
            const updates = categories.map(cat => {
                const rawAmount = localBudgets[cat.id];
                // Convert to float, default to 0 if invalid/empty
                const newAmount = typeof rawAmount === 'string'
                    ? parseFloat(rawAmount) || 0
                    : rawAmount || 0;

                // Save strictly as Year-specific override
                return budgetService.updateCategoryYearlyBudget(cat.id, selectedYear, newAmount);
            });

            await Promise.all(updates.filter(Boolean));
            setEditMode(false);
            return true;
        } catch (error) {
            console.error("Error saving budgets:", error);
            return false;
        }
    };

    const openEditModal = () => {
        const initial: Record<string, string | number> = {};
        categories.forEach(c => {
            // Load existing year budget or fallback
            const val = c.budgets?.[String(selectedYear)] ?? c.budgetMonthly ?? 0;
            initial[c.id] = val;
        });
        setLocalBudgets(initial);
        setEditMode(true);
    };

    return {
        budgetStatus, // Annual summary
        monthlyStatus,// Month-by-month breakdown
        categories,
        loading,
        currency,
        editMode,
        setEditMode,
        localBudgets,
        setLocalBudgets,
        openEditModal,
        handleSaveBudgets,
        selectedYear,
        setSelectedYear
    };
}

