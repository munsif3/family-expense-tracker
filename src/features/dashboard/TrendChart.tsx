'use client';

import { Transaction } from '@/types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useMemo } from 'react';

interface TrendChartProps {
    transactions: Transaction[];
    currency: string;
}

export function TrendChart({ transactions, currency }: TrendChartProps) {
    const data = useMemo(() => {
        // Group by date (simple implementation for "Trend")
        // In a real app, this should fill in missing dates or group by week/month
        const dateMap: Record<string, number> = {};

        // Sort transactions by date asc
        const sorted = [...transactions].sort((a, b) => a.date.toMillis() - b.date.toMillis());

        sorted.forEach(t => {
            // Just tracking "Net Worth Change" or "Spending" ? 
            // User screenshot says "6-Month Trend". Let's track Expenses for now roughly.
            // Or Balance? Screenshot looks like a curve. Let's do Balance curve (Income - Expense).
            const day = format(t.date.toDate(), 'MMM d');
            const amount = t.type === 'income' ? t.amount : -t.amount;
            dateMap[day] = (dateMap[day] || 0) + amount;
        });

        // Accumulate for a "Balance" trend? Or just daily Spend?
        // Screenshot 4 is "Total Budgeted", Screenshot 1 is "Trend (Line)".
        // Let's smooth it out, just showing daily net flow.

        return Object.entries(dateMap).map(([date, amount]) => ({ date, amount }));
    }, [transactions]);

    return (
        <Card className="col-span-full md:col-span-1">
            <CardHeader>
                <CardTitle>Trend (Net Flow)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full min-w-0">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" debounce={1} minWidth={0}>
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={30} />
                                <YAxis hide />
                                <Tooltip
                                    formatter={(value: number | undefined) => formatCurrency(value || 0, currency)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#10b981" fillOpacity={1} fill="url(#colorAmount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            No data to show.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
