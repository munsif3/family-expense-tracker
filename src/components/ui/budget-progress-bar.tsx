"use client"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface BudgetProgressBarProps {
    spent: number;
    limit: number;
    className?: string;
    showLabel?: boolean;
    currency?: string;
    labelClassName?: string;
}

export function BudgetProgressBar({
    spent,
    limit,
    className,
    showLabel = false,
    currency = 'USD',
    labelClassName
}: BudgetProgressBarProps) {
    const percentage = limit > 0 ? (spent / limit) * 100 : (spent > 0 ? 100 : 0);

    let colorClass = "bg-emerald-500"; // Green for < 75%
    if (percentage > 90) {
        colorClass = "bg-red-500";
    } else if (percentage >= 75) {
        colorClass = "bg-yellow-500";
    }

    return (
        <div className={cn("w-full space-y-1", className)}>
            <Progress
                value={percentage}
                className="h-2.5 bg-secondary/50"
                indicatorColor={colorClass}
            />
            {showLabel && (
                <div className={cn("flex justify-between text-xs text-muted-foreground font-medium", labelClassName)}>
                    <span>{percentage.toFixed(0)}% Used</span>
                    {limit > 0 && <span>{new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(limit - spent)} Left</span>}
                </div>
            )}
        </div>
    )
}
