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
            { name: 'Income', amount: income, color: '#22c55e' }, // green-500
            { name: 'Expenses', amount: expense, color: '#ef4444' }, // red-500
        ];
    }, [transactions]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cashflow (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                formatter={(value: number) => [formatCurrency(value, currency), 'Amount']}
                            />
                            <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={32}>
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
