import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calculateAnnualStatus, calculateMonthlyStatus, MonthlyBudgetAggregate } from '@/features/budget/budgetUtils';
import { Category } from '@/types';
import { budgetService } from '@/lib/api/budgets';

export function useBudget() {
    const { profile, household } = useAuth();
    const [aggregates, setAggregates] = useState<MonthlyBudgetAggregate[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [localBudgets, setLocalBudgets] = useState<Record<string, string | number>>({});
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const currency = household?.currency || 'USD';

    // Fetch Aggregates (replacing Transactions)
    useEffect(() => {
        if (!profile?.householdId) return;

        // Fetch selected year aggregates
        const q = query(
            collection(db, 'monthly_budgets'),
            where('householdId', '==', profile.householdId),
            where('year', '==', selectedYear)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                ...doc.data(),
            })) as MonthlyBudgetAggregate[];
            setAggregates(data);
            setLoading(false);
        }, (error) => {
            console.error("useBudget snapshot error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [profile?.householdId, selectedYear]);

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
                // Don't disable loading here strictly, wait for aggregates too? 
                // But aggregates might be empty.
                // We'll manage loading state better combined or just use logic below.
            }
        });
        return () => unsubscribe();
    }, [profile?.householdId]);

    // Calculate Status
    const { budgetStatus, monthlyStatus } = useMemo(() => {
        // If loading categories, return empty
        if (categories.length === 0) return { budgetStatus: [], monthlyStatus: [] };

        return {
            budgetStatus: calculateAnnualStatus(aggregates, categories, selectedYear),
            monthlyStatus: calculateMonthlyStatus(aggregates, categories, selectedYear)
        };
    }, [aggregates, categories, selectedYear]);

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
        setSelectedYear,
        aggregates // Export in case needed
    };
}
