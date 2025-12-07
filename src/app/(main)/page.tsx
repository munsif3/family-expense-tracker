'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Transaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { AddTransactionModal } from '@/features/transactions/AddTransactionModal';
import { TransactionList } from '@/features/transactions/TransactionList';
import { CashflowChart } from '@/features/dashboard/CashflowChart';
import { CategoryPieChart } from '@/features/dashboard/CategoryPieChart';
import { TrendChart } from '@/features/dashboard/TrendChart';

export default function DashboardPage() {
    const { profile, household } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [txLoading, setTxLoading] = useState(true);
    const currency = household?.currency || 'USD';

    // Fetch Transactions
    useEffect(() => {
        if (!profile?.householdId) return;

        const q = query(
            collection(db, 'transactions'),
            where('householdId', '==', profile.householdId),
            orderBy('date', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Transaction[];
            setTransactions(data);
            setTxLoading(false);
        }, (error) => {
            console.error("Firestore Error:", error);
            setTxLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.householdId]);

    // Calculations
    const summary = useMemo(() => {
        let income = 0;
        let expense = 0;
        transactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });
        return {
            income,
            expense,
            balance: income - expense,
            savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0
        };
    }, [transactions]);

    return (
        <>
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Overview of your family finances</p>
                </div>
                <div className="flex items-center gap-2">
                    <AddTransactionModal />
                </div>
            </header>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="p-6 bg-card rounded-xl border shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Balance</h3>
                    <div className="text-2xl font-bold mt-2">{formatCurrency(summary.balance, currency)}</div>
                </div>
                <div className="p-6 bg-card rounded-xl border shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">Monthly Income</h3>
                    <div className="text-2xl font-bold mt-2 text-green-600">+{formatCurrency(summary.income, currency)}</div>
                </div>
                <div className="p-6 bg-card rounded-xl border shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">Monthly Expenses</h3>
                    <div className="text-2xl font-bold mt-2 text-red-600">-{formatCurrency(summary.expense, currency)}</div>
                </div>
                <div className="p-6 bg-card rounded-xl border shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">Savings Rate</h3>
                    <div className="text-2xl font-bold mt-2">{summary.savingsRate.toFixed(1)}%</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <div className="col-span-2 grid gap-6 md:grid-cols-2">
                    <CashflowChart transactions={transactions} currency={currency} />
                    <CategoryPieChart transactions={transactions} currency={currency} />
                </div>
                <TrendChart transactions={transactions} currency={currency} />
            </div>

            <div className="grid gap-4">
                <TransactionList transactions={transactions} loading={txLoading} />
            </div>
        </>
    );
}
