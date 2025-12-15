'use client';

import { Transaction } from '@/types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

interface CashflowChartProps {
    transactions: Transaction[];
    currency: string;
}

export function CashflowChart({ transactions, currency }: CashflowChartProps) {
    const data = useMemo(() => {
        let income = 0;
        let expense = 0;

        transactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });

        return [
            { name: 'Income', amount: income, color: 'url(#incomeGradient)' },
            { name: 'Expenses', amount: expense, color: 'url(#expenseGradient)' },
        ];
    }, [transactions]);

    return (
        <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader>
                <CardTitle>Cashflow (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" debounce={1} minWidth={0}>
                        <BarChart layout="vertical" data={data} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="incomeGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#16a34a" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="expenseGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                formatter={(value: any) => [formatCurrency(value, currency), 'Amount']}
                            />
                            <Bar dataKey="amount" radius={[0, 8, 8, 0]} barSize={40}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
