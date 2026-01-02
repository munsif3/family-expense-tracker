'use client';

import { useState } from 'react';
import { useCalendarData } from '@/features/calendar/useCalendarData';
import { Loader2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { CATEGORIES } from '@/lib/constants';
import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, format, addMonths, subMonths,
    isSameMonth, isSameDay, isToday
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AddTransactionModal } from '@/features/transactions/AddTransactionModal';

export default function CalendarPage() {
    const { household } = useAuth();
    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Fetch data for the currently visible month
    const { dailyMap, loading } = useCalendarData(viewDate);
    const currency = household?.currency || 'USD';

    // Calendar Generation Logic
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    // Ensure we always show 6 weeks to keep layout stable
    const calendarEnd = endOfWeek(monthEnd);

    // Sometimes a month spans 4, 5 or 6 weeks. To make it "Large" and stable, let's just generate days until we fill the grid or just use the interval.
    // Standard calendar is usually startOfWeek(monthStart) to endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Pad to 42 days (6 weeks) if needed for consistent height
    // But eachDayOfInterval with start/end of weeks usually handles it well enough. 
    // Let's stick to the interval.

    const nextMonth = () => setViewDate(addMonths(viewDate, 1));
    const prevMonth = () => setViewDate(subMonths(viewDate, 1));
    const jumpToToday = () => {
        const today = new Date();
        setViewDate(today);
        setSelectedDate(today);
    };

    // Get data for selected date
    const selectedDateKey = selectedDate.toDateString();
    const selectedData = dailyMap[selectedDateKey];

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] space-y-4 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
                    <p className="text-muted-foreground">Manage your monthly finances.</p>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                    <Button variant="ghost" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="font-semibold w-32 text-center">
                        {format(viewDate, 'MMMM yyyy')}
                    </div>
                    <Button variant="ghost" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Button variant="ghost" size="sm" onClick={jumpToToday}>
                        Today
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                {/* Large Calendar Grid */}
                <Card className="flex-1 flex flex-col overflow-hidden border shadow-sm">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b bg-muted/20">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6 min-h-0 bg-background">
                        {calendarDays.map((day, dayIdx) => {
                            const dateKey = day.toDateString();
                            const data = dailyMap[dateKey];
                            const isSelected = isSameDay(day, selectedDate);
                            const isCurrentMonth = isSameMonth(day, viewDate);
                            const isTodayDate = isToday(day);

                            return (
                                <div
                                    key={day.toString()}
                                    className={cn(
                                        "relative border-r border-b p-1 sm:p-2 flex flex-col gap-1 transition-colors cursor-pointer group min-h-[80px]",
                                        !isCurrentMonth && "bg-muted/10 text-muted-foreground/50",
                                        isSelected && "bg-primary/5 ring-1 ring-inset ring-primary z-10",
                                        !isSelected && isCurrentMonth && "hover:bg-muted/30"
                                    )}
                                    onClick={() => setSelectedDate(day)}
                                    onDoubleClick={() => {
                                        setSelectedDate(day);
                                        setIsAddModalOpen(true);
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={cn(
                                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                            isTodayDate && "bg-primary text-primary-foreground"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                        {/* Quick Add Button (visible on hover) */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDate(day);
                                                setIsAddModalOpen(true);
                                            }}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {/* Financial Summary */}
                                    {data && (
                                        <div className="flex flex-col gap-0.5 mt-auto">
                                            {data.income > 0 && (
                                                <div className="text-[10px] bg-green-500/10 text-green-700 px-1 rounded flex items-center justify-between truncate font-medium">
                                                    <span className="hidden xl:inline">In</span>
                                                    <span>+{Math.round(data.income)}</span>
                                                </div>
                                            )}
                                            {data.expense > 0 && (
                                                <div className="text-[10px] bg-red-500/10 text-red-700 px-1 rounded flex items-center justify-between truncate font-medium">
                                                    <span className="hidden xl:inline">Out</span>
                                                    <span>-{Math.round(data.expense)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Show a few dots for transactions if screen is small, or small text if large */}
                                    <div className="hidden md:flex flex-col gap-0.5 mt-1 overflow-hidden">
                                        {data?.transactions.slice(0, 2).map((t, i) => (
                                            <div key={i} className="text-[9px] text-muted-foreground truncate leading-tight">
                                                {t.description}
                                            </div>
                                        ))}
                                        {data?.transactions && data.transactions.length > 2 && (
                                            <div className="text-[9px] text-muted-foreground pl-1">
                                                +{data.transactions.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Right Column: Details Panel */}
                <div className="w-full lg:w-[350px] xl:w-[400px] flex flex-col h-auto bg-card rounded-xl border shadow-sm overflow-hidden shrink-0">
                    <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                        <div className="font-semibold">
                            {format(selectedDate, 'EEEE, MMM d')}
                        </div>
                        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4">
                            {loading ? (
                                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                            ) : !selectedData || selectedData.transactions.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20 m-2">
                                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No transactions</p>
                                    <Button variant="link" onClick={() => setIsAddModalOpen(true)}>Add one now?</Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Daily Summary Cards */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-green-500/10 rounded-lg text-center border border-green-500/20">
                                            <div className="text-[10px] text-green-600 uppercase font-bold mb-1">Income</div>
                                            <div className="text-green-700 text-lg font-bold flex items-center justify-center gap-1">
                                                <ArrowUp className="h-3 w-3" />
                                                {formatCurrency(selectedData.income, currency)}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-red-500/10 rounded-lg text-center border border-red-500/20">
                                            <div className="text-[10px] text-red-600 uppercase font-bold mb-1">Expenses</div>
                                            <div className="text-red-700 text-lg font-bold flex items-center justify-center gap-1">
                                                <ArrowDown className="h-3 w-3" />
                                                {formatCurrency(selectedData.expense, currency)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium text-muted-foreground">Transactions</h3>
                                        <div className="space-y-2">
                                            {selectedData.transactions.map(t => {
                                                const cat = CATEGORIES.find(c => c.id === t.categoryId);
                                                return (
                                                    <div key={t.id} className="group flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors bg-background">
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="font-medium text-sm truncate">{t.description}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground">{cat?.name || 'Other'}</span>
                                                                {t.isRecurring && (
                                                                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded-sm">Recurring</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className={`font-bold text-sm whitespace-nowrap pl-2 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AddTransactionModal
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
                defaultDate={selectedDate}
            />
        </div>
    );
}
