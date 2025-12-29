import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Timestamp, where, orderBy, onSnapshot } from 'firebase/firestore';

import { createSecureQuery } from '@/lib/firestoreUtils';
import { Transaction } from '@/types';
import { startOfMonth, subMonths } from 'date-fns';
import { useBudget } from '@/features/budget/useBudget';

export interface Insight {
    id: string;
    type: 'warning' | 'trend' | 'positive';
    title: string;
    message: string;
    action?: string; // e.g., "Review Budget"
    priority: number; // 1 (High) to 3 (Low)
}

const toDate = (val: Date | Timestamp | string | number | null | undefined): Date => {
    if (!val) return new Date(); // Fallback
    if (val instanceof Date) return val;
    if (val instanceof Timestamp) return val.toDate();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (val as any).toDate === 'function') return (val as any).toDate(); // Safety fallback
    return new Date(val as string | number);
};

export function useFinancialInsights() {
    const { profile } = useAuth();
    const { localBudgets, categories } = useBudget(); // Access budget limits
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch last 2 months of data (Current Month + Last Month) to compare
    useEffect(() => {
        if (!profile?.householdId) return;

        const startDate = startOfMonth(subMonths(new Date(), 1)); // 1st of Last Month

        const q = createSecureQuery({
            collectionName: 'transactions',
            householdId: profile.householdId,
            userId: profile.uid,
            constraints: [
                where('date', '>=', startDate.toISOString()), // Assuming ISO string storage
                orderBy('date', 'desc')
            ]
        });

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Transaction[];
            setTransactions(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.householdId, profile?.uid]);

    const insights = useMemo(() => {
        if (loading || transactions.length === 0) return [];

        const newInsights: Insight[] = [];
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));

        const currentMonthTx = transactions.filter(t => toDate(t.date) >= currentMonthStart);
        const lastMonthTx = transactions.filter(t => {
            const d = toDate(t.date);
            return d >= lastMonthStart && d < currentMonthStart;
        });

        // --- 1. Smart Alerts (Velocity) ---
        // Warning if > 80% of budget spent before day 20
        const dayOfMonth = now.getDate();

        if (dayOfMonth < 20) {
            const spendingByCategory: Record<string, number> = {};
            currentMonthTx.filter(t => t.type === 'expense').forEach(t => {
                if (t.categoryId) {
                    spendingByCategory[t.categoryId] = (spendingByCategory[t.categoryId] || 0) + t.amount;
                }
            });

            Object.entries(spendingByCategory).forEach(([catId, spent]) => {
                const budgetVal = localBudgets[catId];
                const budget = parseFloat(budgetVal?.toString() || '0');
                if (budget > 0) {
                    const ratio = spent / budget;
                    if (ratio > 0.8) {
                        const catName = categories.find(c => c.id === catId)?.name || 'Unknown';
                        newInsights.push({
                            id: `velocity-${catId}`,
                            type: 'warning',
                            title: 'Rapid Spending Alert',
                            message: `You've spent ${Math.round(ratio * 100)}% of your ${catName} budget and it's only day ${dayOfMonth}.`,
                            priority: 1
                        });
                    }
                }
            });
        }

        // --- 2. Trend Spotting (MoM) ---
        // Compare category spending Current vs Last Month (pro-rated logic is complex, simple absolute for now)
        // Better logic: Compare "Spending to date" vs "Spending to same date last month"? 
        // For simplicity: Alert if Current > Last Month Total * 1.1 (and Last Month is over)

        // Let's do a simple comparison: "Utility bill is higher"
        // Only valid if we have last month data.
        if (lastMonthTx.length > 0) {
            const currentByCat: Record<string, number> = {};
            const lastByCat: Record<string, number> = {};

            currentMonthTx.forEach(t => { if (t.categoryId) currentByCat[t.categoryId] = (currentByCat[t.categoryId] || 0) + (t.type === 'expense' ? t.amount : 0) });
            lastMonthTx.forEach(t => { if (t.categoryId) lastByCat[t.categoryId] = (lastByCat[t.categoryId] || 0) + (t.type === 'expense' ? t.amount : 0) });

            Object.entries(currentByCat).forEach(([catId, currentAmount]) => {
                const lastAmount = lastByCat[catId] || 0;
                if (lastAmount > 100 && currentAmount > lastAmount * 1.15) { // Threshold to avoid noise
                    const catName = categories.find(c => c.id === catId)?.name || 'Category';
                    newInsights.push({
                        id: `trend-${catId}`,
                        type: 'trend',
                        title: 'Spending Spike',
                        message: `Your ${catName} spending is 15% higher than last month.`,
                        priority: 2
                    });
                }
            });
        }

        // --- 3. Positive Reinforcement ---
        // Savings rate check?
        const income = currentMonthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = currentMonthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        if (income > 0 && expense > 0) {
            const savingsRate = (income - expense) / income;
            if (savingsRate > 0.2) {
                newInsights.push({
                    id: 'savings-good',
                    type: 'positive',
                    title: 'Great Savings Rate!',
                    message: `You're saving ${Math.round(savingsRate * 100)}% of your income this month. Keep it up!`,
                    priority: 3
                });
            }
        }

        return newInsights.sort((a, b) => a.priority - b.priority);

    }, [transactions, localBudgets, categories, loading]);

    return { insights, loading };
}
