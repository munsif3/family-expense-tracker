
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfile, TripFund, TripExpense, TripReturn } from "@/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTripCalculations } from "../hooks/useTripCalculations";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from 'react';

interface TripAnalyticsProps {
    funds: TripFund[];
    expenses: TripExpense[];
    returns: TripReturn[];
    participants: UserProfile[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function TripAnalytics({ funds, expenses, returns, participants }: TripAnalyticsProps) {
    const { byUser } = useTripCalculations(funds, expenses, returns);

    const [selectedPayer, setSelectedPayer] = useState<string>('all');

    // 1. Expenses by Category Data (Filtered)
    const categoryData = useMemo(() => {
        // If 'all', use the pre-calculated byCategory from hook (which includes everyone)
        // OR re-calculate if we want to support switching.
        // Actually, the hook returns ALL. If we want filtered, we should calculate it here.

        let filteredExpenses = expenses;
        if (selectedPayer !== 'all') {
            filteredExpenses = expenses.filter(e => e.paidBy === selectedPayer);
        }

        const stats: Record<string, number> = {};
        filteredExpenses.forEach(e => {
            const cat = e.category;
            stats[cat] = (stats[cat] || 0) + (e.baseAmount || 0);
        });

        return Object.entries(stats)
            .filter(([, value]) => value > 0)
            .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    }, [expenses, selectedPayer]);

    // 2. Member Balances Data
    const getName = (uid: string) => participants.find(p => p.uid === uid)?.displayName || uid.substring(0, 5);

    const balanceData = Object.entries(byUser).map(([userId, stats]) => ({
        name: getName(userId),
        Net: stats.balance // using balance from useTripCalculations which handles contribution - spent - returnsReceived
    }));

    if (expenses.length === 0 && funds.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">No data to display analytics.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expenses by Category */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">Expenses by Category</CardTitle>
                        <Select value={selectedPayer} onValueChange={setSelectedPayer}>
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {participants.map(p => (
                                    <SelectItem key={p.uid} value={p.uid}>{p.displayName || 'Unknown'}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <Tooltip formatter={(value: any) => value.toFixed(2)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Balances */}
                <Card>
                    <CardHeader>
                        <CardTitle>Net Balances</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={balanceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={80} />
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <Tooltip formatter={(value: any) => value?.toFixed(2)} />
                                <Legend />
                                <Bar dataKey="Net" fill="#8884d8">
                                    {balanceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.Net >= 0 ? '#4ade80' : '#f87171'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
