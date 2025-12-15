'use client';


import { useState, useMemo } from 'react';
import { useTransactionsList } from '@/features/transactions/useTransactionsList';
import { useAuth } from '@/features/auth/AuthContext';
import { CashflowChart } from '@/features/dashboard/CashflowChart';
import { CategoryPieChart } from '@/features/dashboard/CategoryPieChart';
import { TrendChart } from '@/features/dashboard/TrendChart';
import { TransactionList } from '@/features/transactions/TransactionList';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownLeft, ArrowUpRight, Wallet, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { useFinancialInsights } from '@/features/insights/useFinancialInsights';
import { InsightsWidget } from '@/features/insights/InsightsWidget';


import { useDashboardMetrics } from '@/features/dashboard/useDashboardMetrics';

export default function DashboardPage() {
    const { transactions, loading } = useTransactionsList();
    const { household, user } = useAuth();
    const [viewMode, setViewMode] = useState<'family' | 'personal'>('family');
    const currency = household?.currency || 'USD';

    const displayedTransactions = useMemo(() => {
        if (viewMode === 'family') {
            // Family view: Show all EXCEPT personal expenses
            return transactions.filter(t => !t.isPersonal);
        }
        // Personal view: Show transactions spent by ME
        return transactions.filter(t => (t.spentBy === user?.uid) || (!t.spentBy && t.userId === user?.uid));
    }, [transactions, viewMode, user]);

    const { insights, loading: insightsLoading } = useFinancialInsights();

    // Calculate summary using hook
    const summary = useDashboardMetrics(displayedTransactions);

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
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground mt-1">Overview of your family finances</p>
                </div>
                <Tabs value={viewMode} onValueChange={(v: string) => setViewMode(v as 'family' | 'personal')}>
                    <TabsList>
                        <Tooltip content="All household transactions excluding personal expenses." side="bottom">
                            <TabsTrigger value="family">Family View</TabsTrigger>
                        </Tooltip>
                        <Tooltip content="All transactions spent by you (including personal)." side="bottom">
                            <TabsTrigger value="personal">My View</TabsTrigger>
                        </Tooltip>
                    </TabsList>
                </Tabs>
            </div>

            <InsightsWidget insights={insights} loading={insightsLoading} />

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <Tooltip
                        content={viewMode === 'family'
                            ? "Total Household Income - Shared Expenses"
                            : "Your Total Income - Your Total Spending"}
                        side="top"
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-help">
                            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                    </Tooltip>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary.balance, currency)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Current month net flow
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <Tooltip
                        content={viewMode === 'family'
                            ? "All income sources from household members"
                            : "Income attributed to you"}
                        side="top"
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-help">
                            <CardTitle className="text-sm font-medium">Income</CardTitle>
                            <ArrowDownLeft className="h-4 w-4 text-green-500" />
                        </CardHeader>
                    </Tooltip>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+{formatCurrency(summary.income, currency)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            This month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <Tooltip
                        content={viewMode === 'family'
                            ? "Shared household expenses (excludes personal items)"
                            : "Your expenses (includes shared & personal items)"}
                        side="top"
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-help">
                            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                        </CardHeader>
                    </Tooltip>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">-{formatCurrency(summary.expenses, currency)}</div>
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
                    <CashflowChart transactions={displayedTransactions} currency={currency} />
                </div>

                {/* Recent Transactions List */}
                <div className="col-span-3">
                    <TransactionList transactions={displayedTransactions} compact />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <CategoryPieChart transactions={displayedTransactions} currency={currency} />
                <TrendChart transactions={displayedTransactions} currency={currency} />
            </div>
        </div>
    );
}
// Force rebuild
