import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createSecureQuery } from '@/lib/firestoreUtils';
import { calculateAnnualStatus, calculateMonthlyStatus } from '@/features/budget/budgetUtils';
import { Transaction, Category } from '@/types';
import { budgetService } from '@/lib/api/budgets';

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
        const q = createSecureQuery({
            collectionName: 'transactions',
            householdId: profile.householdId,
            userId: profile.uid,
            constraints: [where('type', '==', 'expense')]
        });

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
    }, [profile?.householdId, profile?.uid]);

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
        return {
            budgetStatus: calculateAnnualStatus(transactions, categories, selectedYear),
            monthlyStatus: calculateMonthlyStatus(transactions, categories, selectedYear)
        };
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
