"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay
} from "date-fns"
import { cn } from "@/lib/utils"

export interface CalendarProps {
    mode?: "single"
    selected?: Date
    onSelect?: (date: Date | undefined) => void
    month: Date
    onMonthChange: (date: Date) => void
    className?: string
    modifiers?: {
        income?: (date: Date) => boolean
        expense?: (date: Date) => boolean
    }
    renderDay?: (date: Date) => React.ReactNode
}

export function Calendar({
    mode = "single",
    selected,
    onSelect,
    month,
    onMonthChange,
    className,
    modifiers,
    renderDay
}: CalendarProps) {

    const handlePreviousMonth = () => onMonthChange(subMonths(month, 1))
    const handleNextMonth = () => onMonthChange(addMonths(month, 1))

    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    // Weekday headers
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    return (
        <div className={cn("p-4 w-full h-full flex flex-col", className)}>
            <div className="flex items-center justify-between space-x-4 pb-6">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                        onClick={handlePreviousMonth}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                        onClick={handleNextMonth}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
                <div className="text-xl font-bold">
                    {format(month, "MMMM yyyy")}
                </div>
                <div className="w-[70px]"></div> {/* Spacer for balance */}
            </div>

            {/* Header Row */}
            <div className="grid grid-cols-7 w-full border-t border-l border-r rounded-t-lg bg-muted/40">
                {weekDays.map((day) => (
                    <div key={day} className="text-muted-foreground text-sm font-semibold h-10 flex items-center justify-center border-b">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 w-full border-l border-b bg-card rounded-b-lg overflow-hidden flex-1">
                {days.map((day, idx) => {
                    const isSelected = selected && isSameDay(day, selected);
                    const isCurrentMonth = isSameMonth(day, month);

                    return (
                        <button
                            key={day.toString()}
                            type="button"
                            onClick={() => onSelect?.(day)}
                            className={cn(
                                "min-h-[100px] p-2 flex flex-col items-start justify-start border-r border-b transition-colors hover:bg-accent/30 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                                !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                                isSelected && "ring-2 ring-inset ring-primary bg-accent/20",
                                isSameDay(day, new Date()) && "bg-blue-50/50 dark:bg-blue-950/20"
                            )}
                        >
                            <span className={cn(
                                "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                                isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : "text-foreground"
                            )}>
                                {format(day, "d")}
                            </span>

                            {/* Content Render */}
                            <div className="w-full flex-1">
                                {renderDay?.(day)}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
