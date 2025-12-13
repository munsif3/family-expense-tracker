import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowUpRight, ArrowDownLeft, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { StatementData } from './useMonthlyStatement';
import { Progress } from '@/components/ui/progress';

interface MonthlyStatementProps {
    statement: StatementData;
    currency: string;
    loading: boolean;
}

export function MonthlyStatement({ statement, currency, loading }: MonthlyStatementProps) {
    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const { totalIncome, totalExpense, net, income, expense, savingsRate } = statement;

    return (
        <div className="space-y-6">
            {/* Top Level Summary Cards */}
            {/* Top Level Summary Equation */}
            <Card className="bg-gradient-to-br from-background to-muted/20 border-2">
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">

                        {/* Income */}
                        <div className="text-center w-full md:w-auto">
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Income</p>
                            <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                                +{formatCurrency(totalIncome, currency)}
                            </div>
                        </div>

                        {/* Minus Operation */}
                        <div className="hidden md:flex flex-col items-center justify-center pt-6">
                            <span className="text-2xl font-black text-muted-foreground/30">-</span>
                        </div>
                        {/* Mobile Divider */}
                        <div className="md:hidden w-12 h-1 bg-muted-foreground/20 rounded" />

                        {/* Expense */}
                        <div className="text-center w-full md:w-auto">
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Expenses</p>
                            <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
                                -{formatCurrency(totalExpense, currency)}
                            </div>
                        </div>

                        {/* Equals Operation */}
                        <div className="hidden md:flex flex-col items-center justify-center pt-6">
                            <span className="text-2xl font-black text-muted-foreground/30">=</span>
                        </div>
                        {/* Mobile Divider */}
                        <div className="md:hidden w-full border-t border-dashed border-muted-foreground/30" />

                        {/* Result (Hero) */}
                        <div className={`text-center w-full md:w-auto rounded-2xl p-4 md:px-8 md:py-4 border shadow-sm ${net >= 0 ? 'bg-primary/5 border-primary/10' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'}`}>
                            <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${net >= 0 ? 'text-primary' : 'text-red-600 dark:text-red-400'}`}>
                                {net >= 0 ? 'Leftover Savings' : 'Net Deficit'}
                            </p>
                            <div className={`text-3xl md:text-5xl font-black tracking-tight ${net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-500'}`}>
                                {net >= 0 ? '+' : ''}{formatCurrency(net, currency)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 font-medium">
                                {net >= 0
                                    ? (savingsRate > 0 ? `Savings Rate: ${Math.round(savingsRate)}%` : 'No savings this month')
                                    : 'You spent more than you earned'}
                            </p>
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* Detailed Tables */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Income Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Income Sources</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {income.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No income records found.</p>
                        ) : (
                            income.map((item) => (
                                <div key={item.category} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{item.category}</span>
                                        <span className="font-bold text-green-600">
                                            {formatCurrency(item.amount, currency)}
                                        </span>
                                    </div>
                                    <Progress value={item.percentage} className="h-2 bg-muted/50 [&>div]:bg-green-500" />
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Expense Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Expense Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {expense.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No expense records found.</p>
                        ) : (
                            expense.map((item) => (
                                <div key={item.category} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{item.category}</span>
                                        <span className="font-bold text-red-600">
                                            {formatCurrency(item.amount, currency)}
                                        </span>
                                    </div>
                                    <Progress value={item.percentage} className="h-2 bg-muted/50 [&>div]:bg-red-500" />
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
