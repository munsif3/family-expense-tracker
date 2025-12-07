'use client';

import { Transaction } from '@/types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

interface CategoryPieChartProps {
    transactions: Transaction[];
    currency: string;
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

export function CategoryPieChart({ transactions, currency }: CategoryPieChartProps) {
    const data = useMemo(() => {
        const categoryMap: Record<string, number> = {};

        transactions.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.categoryName || 'Other';
            categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
        });

        return Object.entries(categoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6 categories
    }, [transactions]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value, currency)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            No expenses to show.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
