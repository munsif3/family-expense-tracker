import { useMemo } from 'react';
import { Transaction } from '@/types';

interface DashboardMetrics {
    income: number;
    expenses: number;
    balance: number;
    savingsRate: number;
}

export function useDashboardMetrics(transactions: Transaction[]) {
    const metrics = useMemo<DashboardMetrics>(() => {
        let income = 0;
        let expenses = 0;

        transactions.forEach(t => {
            if (t.type === 'income') {
                income += t.amount;
            } else {
                expenses += t.amount;
            }
        });

        const balance = income - expenses;
        const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

        return {
            income,
            expenses,
            balance,
            savingsRate
        };
    }, [transactions]);

    return metrics;
}
