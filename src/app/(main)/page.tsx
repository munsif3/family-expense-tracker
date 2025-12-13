'use client';

import { useDashboard } from '@/features/dashboard/useDashboard';
import { TransactionList } from '@/features/transactions/TransactionList';
import { CashflowChart } from '@/features/dashboard/CashflowChart';
import { CategoryPieChart } from '@/features/dashboard/CategoryPieChart';
import { TrendChart } from '@/features/dashboard/TrendChart';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { ArrowDownLeft, ArrowUpRight, Wallet, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useFinancialInsights } from '@/features/insights/useFinancialInsights';
import { InsightsWidget } from '@/features/insights/InsightsWidget';


export default function DashboardPage() {
    const {
        summary,
        loading,
        currency,
        transactions
    } = useDashboard();

    const { insights, loading: insightsLoading } = useFinancialInsights();

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 md:pb-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Overview of your family finances</p>
                </div>
            </div>

            <InsightsWidget insights={insights} loading={insightsLoading} />

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.balance, currency)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Current month net flow
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Income</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+{formatCurrency(summary.income, currency)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            This month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">-{formatCurrency(summary.expense, currency)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            This month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Cashflow Bar Chart */}
                <div className="col-span-4">
                    <CashflowChart transactions={transactions} currency={currency} />
                </div>

                {/* Recent Transactions List */}
                <div className="col-span-3">
                    <TransactionList transactions={transactions} compact />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <CategoryPieChart transactions={transactions} currency={currency} />
                <TrendChart transactions={transactions} currency={currency} />
            </div>
        </div>
    );
}
