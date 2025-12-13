import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { where, orderBy, onSnapshot } from 'firebase/firestore';
import { createSecureQuery } from '@/lib/firestoreUtils';
import { Transaction } from '@/types';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { toJsDate } from '@/utils/dateUtils';

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
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.householdId) return;

        setLoading(true);

        const startDate = startOfMonth(new Date(year, month));
        const endDate = endOfMonth(new Date(year, month));

        // console.log(`[MonthlyReport] Fetching for: ${startDate.toISOString()} to ${endDate.toISOString()} (HH: ${profile.householdId})`);

        const q = createSecureQuery({
            collectionName: 'transactions',
            householdId: profile.householdId,
            userId: profile.uid,
            constraints: [
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date', 'desc')
            ]
        });

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Transaction[];
            // console.log(`[MonthlyReport] Received ${data.length} transactions`);
            setTransactions(data);
            setLoading(false);
        }, (error) => {
            console.error("Monthly Report Query Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.householdId, month, year]);

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
