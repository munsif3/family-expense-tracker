import { useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { where, orderBy } from 'firebase/firestore';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { createSecureQuery } from '@/lib/firestoreUtils';
import { Transaction } from '@/types';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface GroupedCategory {
    category: string;
    amount: number;
    percentage: number;
}

export interface StatementData {
    income: GroupedCategory[];
    expense: GroupedCategory[];
    totalIncome: number;
    totalExpense: number;
    net: number;
    savingsRate: number;
}

export function useMonthlyStatement(month: number, year: number) {
    const { profile } = useAuth();

    const q = useMemo(() => {
        if (!profile?.householdId) return null;

        const startDate = startOfMonth(new Date(year, month));
        const endDate = endOfMonth(new Date(year, month));

        return createSecureQuery({
            collectionName: 'transactions',
            householdId: profile.householdId,
            userId: profile.uid,
            constraints: [
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date', 'desc')
            ]
        });
    }, [profile?.householdId, month, year, profile?.uid]);

    const { data: transactions, loading } = useFirestoreCollection<Transaction>(q, [q]);

    const statement: StatementData = useMemo(() => {
        const incomeMap: Record<string, number> = {};
        const expenseMap: Record<string, number> = {};
        let totalIncome = 0;
        let totalExpense = 0;

        transactions.forEach(t => {
            const amount = t.amount;
            const category = t.categoryName || 'Uncategorized';

            if (t.type === 'income') {
                incomeMap[category] = (incomeMap[category] || 0) + amount;
                totalIncome += amount;
            } else {
                expenseMap[category] = (expenseMap[category] || 0) + amount;
                totalExpense += amount;
            }
        });

        const toGroup = (map: Record<string, number>, total: number): GroupedCategory[] => {
            return Object.entries(map)
                .map(([category, amount]) => ({
                    category,
                    amount,
                    percentage: total > 0 ? (amount / total) * 100 : 0
                }))
                .sort((a, b) => b.amount - a.amount);
        };

        const net = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

        return {
            income: toGroup(incomeMap, totalIncome),
            expense: toGroup(expenseMap, totalExpense),
            totalIncome,
            totalExpense,
            net,
            savingsRate
        };
    }, [transactions]);

    return { statement, loading };
}
