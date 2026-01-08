
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '@/lib/utils';
import { UserProfile, TripFund, TripExpense, TripReturn, TripBudget } from "@/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTripCalculations } from "../hooks/useTripCalculations";
import { getConversionRate } from "../utils/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from 'react';

interface TripAnalyticsProps {
    funds: TripFund[];
    expenses: TripExpense[];
    returns: TripReturn[];
    participants: UserProfile[];
    budgetItems: TripBudget[];
    householdCurrency: string;
    budgetRates?: Record<string, number>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function TripAnalytics({ funds, expenses, returns, participants, budgetItems, householdCurrency, budgetRates = {} }: TripAnalyticsProps) {
    const { byUser, totals } = useTripCalculations(funds, expenses, returns);

    const [selectedPayer, setSelectedPayer] = useState<string>('all');

    // 0. Budget Calculations
    const budgetStats = useMemo(() => {
        const stats = new Map<string, { budget: number; spent: number }>();

        // Init with all currencies from budget AND expenses
        budgetItems.forEach(b => {
            if (!stats.has(b.currency)) stats.set(b.currency, { budget: 0, spent: 0 });
            stats.get(b.currency)!.budget += b.amount;
        });
        expenses.forEach(e => {
            if (!stats.has(e.currency)) stats.set(e.currency, { budget: 0, spent: 0 });
            stats.get(e.currency)!.spent += e.amount;
        });

        return Array.from(stats.entries()).map(([currency, { budget, spent }]) => ({
            currency,
            budget,
            spent,
            variance: budget - spent,
            percent: budget > 0 ? (spent / budget) * 100 : 0
        }));
    }, [budgetItems, expenses]);

    const totalBudgetEstimateBase = useMemo(() => {
        // Fallback rates from funds if custom rates missing
        const fundRates = new Map<string, number>();
        funds.forEach(f => fundRates.set(f.currency, f.conversionRate));

        return budgetItems.reduce((acc, item) => {
            let amount = item.amount;
            if (item.currency !== householdCurrency) {
                // 1. Try custom budget rates
                // We need access to trip.budgetRates here. 
                // Since we don't have it yet, this is a placeholder to remind us to add the prop.
                const rate = fundRates.get(item.currency);
                if (rate) amount = item.amount * rate;
            }
            return acc + amount;
        }, 0);
    }, [budgetItems, funds, householdCurrency]);

    const budgetVarianceBase = totalBudgetEstimateBase - totals.totalExpenses;
    const isOverBudgetBase = budgetVarianceBase < 0;
    const progressBase = totalBudgetEstimateBase > 0 ? (totals.totalExpenses / totalBudgetEstimateBase) * 100 : 0;


    // 1. Expenses by Category Data (Filtered)
    const categoryData = useMemo(() => {
        let filteredExpenses = expenses;
        if (selectedPayer !== 'all') {
            filteredExpenses = expenses.filter(e => e.paidBy === selectedPayer);
        }

        const stats: Record<string, number> = {};
        filteredExpenses.forEach(e => {
            const cat = e.category;
            stats[cat] = (stats[cat] || 0) + (e.baseAmount || 0); // Analytics always uses base for charts
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

    // 3. Filtered Lists for Table View
    const filteredFunds = useMemo(() => {
        return funds
            .filter(f => selectedPayer === 'all' || f.contributorId === selectedPayer)
            .sort((a, b) => b.date.toMillis() - a.date.toMillis());
    }, [funds, selectedPayer]);

    const filteredExpenses = useMemo(() => {
        return expenses
            .filter(e => selectedPayer === 'all' || e.paidBy === selectedPayer)
            .sort((a, b) => b.date.toMillis() - a.date.toMillis());
    }, [expenses, selectedPayer]);

    if (expenses.length === 0 && funds.length === 0 && budgetItems.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">No data to display analytics.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Select value={selectedPayer} onValueChange={setSelectedPayer}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Member" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        {participants.map(p => (
                            <SelectItem key={p.uid} value={p.uid}>{p.displayName || 'Unknown'}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Budget Overview */}
            {budgetItems.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium flex justify-between items-center">
                            <span>Budget Overview</span>
                            <span className={isOverBudgetBase ? "text-red-500 text-sm" : "text-green-500 text-sm"}>
                                Est. Total: {isOverBudgetBase ? "Over Budget" : "Under Budget"}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Base Summary - Moved to Top for Emphasis */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm text-muted-foreground">Est. Total Budget ({householdCurrency})</p>
                                    <p className="text-3xl font-bold text-primary">{formatCurrency(totalBudgetEstimateBase, householdCurrency)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total Spent ({householdCurrency})</p>
                                    <p className="text-3xl font-bold">{formatCurrency(totals.totalExpenses, householdCurrency)}</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="h-4 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${isOverBudgetBase ? 'bg-red-500' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(progressBase, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>0%</span>
                                    <span>{progressBase.toFixed(1)}% Used</span>
                                    <span>{isOverBudgetBase ? `Over Budget by ${formatCurrency(Math.abs(budgetVarianceBase), householdCurrency)}` : `Under Budget by ${formatCurrency(budgetVarianceBase, householdCurrency)}`}</span>
                                </div>
                            </div>
                        </div>

                        {/* Budget Composition Table */}
                        <div className="mt-6 pt-6 border-t">
                            <h4 className="text-sm font-medium mb-3">Budget Composition</h4>
                            <div className="border rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="p-2 text-left font-medium">Currency</th>
                                            <th className="p-2 text-right font-medium">Planned</th>
                                            <th className="p-2 text-right font-medium">Est. in {householdCurrency}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {budgetStats.map(stat => {
                                            // Calculate rate used for this display
                                            let rate = getConversionRate(stat.currency, householdCurrency, budgetRates);
                                            // Fallback to fund rate if logic mirrors estimate calculation
                                            // Note: ideally we expose the rate used in calculation to be consistent
                                            if (rate === null) {
                                                const fund = funds.find(f => f.currency === stat.currency);
                                                rate = fund ? fund.conversionRate : null;
                                            }

                                            const baseVal = rate ? stat.budget * rate : stat.budget; // simplified fallback

                                            return (
                                                <tr key={stat.currency} className="bg-card">
                                                    <td className="p-2 font-medium">{stat.currency}</td>
                                                    <td className="p-2 text-right text-muted-foreground">{formatCurrency(stat.budget, stat.currency)}</td>
                                                    <td className="p-2 text-right font-medium text-primary">
                                                        {stat.currency !== householdCurrency ? (
                                                            <span>{formatCurrency(baseVal, householdCurrency)} <span className="text-xs text-muted-foreground">(@ {rate?.toFixed(2) || '?'})</span></span>
                                                        ) : (
                                                            formatCurrency(stat.budget, householdCurrency)
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expenses by Category */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">Expenses by Category</CardTitle>
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
                                <Tooltip formatter={(value: any) => formatCurrency(value, householdCurrency)} />
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
                                <Tooltip formatter={(value: any) => formatCurrency(value, householdCurrency)} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contributions by User */}
                <Card>
                    <CardHeader>
                        <CardTitle>Contributions by Member</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={Object.entries(byUser).map(([uid, stats]) => ({
                                    name: getName(uid),
                                    value: stats.contributed
                                }))}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={80} />
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <Tooltip formatter={(value: any) => formatCurrency(value, householdCurrency)} />
                                <Legend />
                                <Bar dataKey="value" name="Contributed" fill="#4ade80" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Spending by User */}
                <Card>
                    <CardHeader>
                        <CardTitle>Spending by Member</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={Object.entries(byUser).map(([uid, stats]) => ({
                                    name: getName(uid),
                                    value: stats.spent
                                }))}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={80} />
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <Tooltip formatter={(value: any) => formatCurrency(value, householdCurrency)} />
                                <Legend />
                                <Bar dataKey="value" name="Spent" fill="#f87171" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>


            {/* Transaction Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Funds Added</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead className="text-right">Base ({householdCurrency})</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFunds.length > 0 ? (
                                        filteredFunds.map(fund => (
                                            <TableRow key={fund.id}>
                                                <TableCell className="text-xs">{fund.date.toDate().toLocaleDateString()}</TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="font-medium">{formatCurrency(fund.amount, fund.currency)}</div>
                                                    <div className="text-[10px] text-muted-foreground">{fund.exchangeLocation || 'Manual Entry'}</div>
                                                </TableCell>
                                                <TableCell className="text-right text-xs font-medium text-green-600">
                                                    {formatCurrency(fund.baseAmount || 0, householdCurrency)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No funds found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Expenses Paid</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Base ({householdCurrency})</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredExpenses.length > 0 ? (
                                        filteredExpenses.map(expense => (
                                            <TableRow key={expense.id}>
                                                <TableCell className="text-xs">{expense.date.toDate().toLocaleDateString()}</TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="font-medium">{expense.category}</div>
                                                    <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{expense.notes || 'No description'}</div>
                                                    <div className="text-[10px] text-muted-foreground">{formatCurrency(expense.amount, expense.currency)}</div>
                                                </TableCell>
                                                <TableCell className="text-right text-xs font-medium text-red-500">
                                                    {formatCurrency(expense.baseAmount || 0, householdCurrency)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No expenses found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
