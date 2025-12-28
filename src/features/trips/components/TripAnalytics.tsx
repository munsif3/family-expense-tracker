
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfile, TripFund, TripExpense, TripReturn } from "@/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTripCalculations } from "../hooks/useTripCalculations";

interface TripAnalyticsProps {
    funds: TripFund[];
    expenses: TripExpense[];
    returns: TripReturn[];
    participants: UserProfile[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function TripAnalytics({ funds, expenses, returns, participants }: TripAnalyticsProps) {
    const { byCategory, byUser, totals } = useTripCalculations(funds, expenses, returns);

    // 1. Expenses by Category Data
    const categoryData = Object.entries(byCategory)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

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
                    <CardHeader>
                        <CardTitle>Expenses by Category</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
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
                                <Tooltip formatter={(value: any) => value.toFixed(2)} />
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
