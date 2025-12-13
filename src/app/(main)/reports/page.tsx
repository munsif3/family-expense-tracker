'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { MonthlyStatement } from '@/features/reports/MonthlyStatement';
import { useMonthlyStatement } from '@/features/reports/useMonthlyStatement';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Calendar } from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ReportsPage() {
    const { household } = useAuth();
    const currency = household?.currency || 'USD';

    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth().toString());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());

    // Generate year options (last 5 years)
    const years = Array.from({ length: 5 }, (_, i) => (now.getFullYear() - i).toString());

    const { statement, loading } = useMonthlyStatement(
        parseInt(selectedMonth),
        parseInt(selectedYear)
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 md:pb-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Monthly Statement</h1>
                    <p className="text-muted-foreground mt-1">Detailed breakdown of your financial activity</p>
                </div>
            </div>

            {/* Controls Bar */}
            <Card>
                <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-5 w-5" />
                        <span className="font-medium hidden md:inline">Select Period:</span>
                    </div>

                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((m, i) => (
                                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <MonthlyStatement statement={statement} currency={currency} loading={loading} />
        </div>
    );
}
