'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCalendarData } from '@/features/calendar/useCalendarData';
import { Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { CATEGORIES } from '@/lib/constants';

export default function CalendarPage() {
    const { household } = useAuth();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [viewMonth, setViewMonth] = useState<Date>(new Date());

    // Fetch data for the currently visible month
    const { dailyMap, loading } = useCalendarData(viewMonth);
    const currency = household?.currency || 'USD';

    // Get data for selected date
    const selectedDateKey = date?.toDateString();
    const selectedData = selectedDateKey ? dailyMap[selectedDateKey] : null;

    // Render function for each day cell
    const renderDayCell = (day: Date) => {
        const key = day.toDateString();
        const data = dailyMap[key];

        if (!data) return null;

        return (
            <div className="w-full h-full flex flex-col gap-1 mt-1 overflow-hidden">
                {data.income > 0 && (
                    <div className="text-[10px] sm:text-xs bg-green-500/10 text-green-700 px-1 rounded flex items-center justify-between truncate">
                        <span className="hidden xl:inline">In</span>
                        <span className="font-bold">+{Math.round(data.income)}</span>
                    </div>
                )}
                {data.expense > 0 && (
                    <div className="text-[10px] sm:text-xs bg-red-500/10 text-red-700 px-1 rounded flex items-center justify-between truncate">
                        <span className="hidden xl:inline">Out</span>
                        <span className="font-bold">-{Math.round(data.expense)}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-auto lg:h-[calc(100vh-100px)] space-y-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
                <p className="text-muted-foreground mt-1">Plan your finances with a monthly overview.</p>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:overflow-hidden min-h-0">

                {/* Left Column: Calendar (Flexible Width) */}
                <Card className="flex-1 flex flex-col overflow-hidden min-h-[600px] lg:min-h-0">
                    <CardContent className="p-0 flex-1 h-full">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            month={viewMonth}
                            onMonthChange={setViewMonth}
                            className="rounded-none border-0 w-full h-full"
                            renderDay={renderDayCell}
                        />
                    </CardContent>
                </Card>

                {/* Right Column: Details Panel (Fixed Width) */}
                <div className="w-full lg:w-[400px] flex flex-col h-auto lg:h-full bg-card rounded-xl border shadow-sm overflow-hidden mb-8 lg:mb-0">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-semibold">
                            {date ? date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a Date'}
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 min-h-[300px] lg:min-h-0">
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                        ) : !date ? (
                            <p className="text-muted-foreground text-center py-8">Select a day from the calendar to view details.</p>
                        ) : !selectedData || selectedData.transactions.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                                <p>No transactions on this day.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Daily Summary Cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-green-500/10 rounded-lg text-center border border-green-500/20">
                                        <div className="text-xs text-green-600 uppercase font-bold mb-1">Income</div>
                                        <div className="text-green-700 text-lg font-bold flex items-center justify-center gap-1">
                                            <ArrowUp className="h-4 w-4" />
                                            {formatCurrency(selectedData.income, currency)}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-red-500/10 rounded-lg text-center border border-red-500/20">
                                        <div className="text-xs text-red-600 uppercase font-bold mb-1">Expenses</div>
                                        <div className="text-red-700 text-lg font-bold flex items-center justify-center gap-1">
                                            <ArrowDown className="h-4 w-4" />
                                            {formatCurrency(selectedData.expense, currency)}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-muted-foreground">Transactions</h3>
                                    {selectedData.transactions.map(t => {
                                        const cat = CATEGORIES.find(c => c.id === t.categoryId);
                                        return (
                                            <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-background">
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-medium text-sm truncate">{t.description}</span>
                                                    <span className="text-xs text-muted-foreground">{cat?.name || 'Other'}</span>
                                                </div>
                                                <div className={`font-bold text-sm whitespace-nowrap pl-2 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
