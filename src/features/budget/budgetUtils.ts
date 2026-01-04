import { Category } from '@/types';

export interface BudgetStatusItem {
    name: string;
    id: string; // id is required for categories
    spent: number;
    budgetAnnual: number;
    percent: number;
    color: string;
}

export interface MonthlyStatusItem {
    monthIndex: number; // 0-11
    monthName: string;
    spent: number;
    budget: number;
    rollover: number; // New field
    available: number; // New field: budget + rollover - spent
    items: BudgetStatusItem[];
}

export interface MonthlyBudgetAggregate {
    householdId?: string;
    year: number;
    month: number;
    categorySpending: Record<string, number>;
    // lastUpdated...
}

/**
 * Calculates the annual budget status for the selected year using Aggregates.
 */
export function calculateAnnualStatus(
    aggregates: MonthlyBudgetAggregate[],
    categories: Category[],
    selectedYear: number
): BudgetStatusItem[] {
    const annualSpendMap: Record<string, number> = {};

    aggregates.forEach(agg => {
        if (agg.year !== selectedYear) return;
        Object.entries(agg.categorySpending).forEach(([catId, amount]) => {
            annualSpendMap[catId] = (annualSpendMap[catId] || 0) + amount;
        });
    });

    return categories.map((cat): BudgetStatusItem => {
        const spent = annualSpendMap[cat.id] || 0;

        // Get monthly budget: check year override first, then fall back to default
        const budgetMonthly = cat.budgets?.[selectedYear] ?? cat.budgetMonthly ?? 0;
        const budgetAnnual = budgetMonthly * 12; // Simple projection

        // OR: Sum of monthly budgets? 
        // If we want "True Annual Limit", it's 12 * limit.

        const percent = budgetAnnual > 0 ? (spent / budgetAnnual) * 100 : (spent > 0 ? 100 : 0);

        return {
            name: cat.name,
            id: cat.id,
            spent,
            budgetAnnual,
            percent,
            color: cat.color || '#cbd5e1'
        };
    }).sort((a, b) => b.spent - a.spent);
}

/**
 * Calculates the month-by-month budget breakdown with Rollover.
 */
export function calculateMonthlyStatus(
    aggregates: MonthlyBudgetAggregate[],
    categories: Category[],
    selectedYear: number
): MonthlyStatusItem[] {

    // Sort aggregates by month just in case
    // We assume aggregates contains data for the selectedYear.

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
        return {
            monthIndex: i,
            spent: 0,
            spendingMap: {} as Record<string, number>
        };
    });

    aggregates.forEach(agg => {
        if (agg.year !== selectedYear) return;
        if (monthlyData[agg.month]) {
            Object.entries(agg.categorySpending).forEach(([catId, amount]) => {
                monthlyData[agg.month].spendingMap[catId] = amount;
                monthlyData[agg.month].spent += amount;
            });
        }
    });

    let runningRollover = 0;

    return monthlyData.map((data, index) => {
        const date = new Date(selectedYear, index, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });

        // Calculate Total Budget for this month (Sum of all category limits)
        const totalBudget = categories.reduce((acc, cat) => {
            return acc + (cat.budgets?.[selectedYear] ?? cat.budgetMonthly ?? 0);
        }, 0);

        // Rollover Logic: 
        // This month's available = Budget + Rollover
        // Next month's rollover = (Budget + Rollover) - Spent

        // Wait, "Rollover Budgets" usually means unused funds from Jan move to Feb.
        // So Feb starts with FebBudget + JanRemainder.
        // JanRemainder = JanBudget - JanSpent.

        // Current Month Rollover (Coming IN) = runningRollover.
        // Carry Over (Going OUT) = (totalBudget + runningRollover) - data.spent.

        const currentRollover = runningRollover; // Inflow
        const available = totalBudget + currentRollover; // Effective Limit
        const diff = available - data.spent; // Net position

        // Update running rollover for NEXT month.
        // Usually, we only rollover positive amounts? Or negative too (debt)?
        // "Rollover Budgets" usually implies keeping the surplus. Deficit might be absorbed or carry over as debt.
        // Let's assume full carry over (positive and negative).
        runningRollover = diff;

        // Items for detail view
        const items = categories.map((cat): BudgetStatusItem => {
            const spent = data.spendingMap[cat.id] || 0;
            const budgetMonthly = cat.budgets?.[selectedYear] ?? cat.budgetMonthly ?? 0;

            // Per-Category Rollover is complex because we track total rollover above.
            // If we want Per-Category Rollover, we need a map of rollovers.
            // The requirement "Current Month's Budget vs. Actual Spend" and "Rollover Budgets".
            // Implementation Plan didn't specify per-category rollover. 
            // Usually global rollover is easier to display. 
            // "Funds from Jan move to Feb".
            // Let's stick to Global Dashboard view having rollover.
            // Individual categories show "Budget vs Spend" for THAT month (isolated), 
            // unless we want detailed rollover. Detailed is better but UI is complex.
            // Using Isolated for items view, Global for summary.

            const percent = budgetMonthly > 0 ? (spent / budgetMonthly) * 100 : (spent > 0 ? 100 : 0);

            return {
                name: cat.name,
                id: cat.id,
                spent,
                budgetAnnual: budgetMonthly, // Actually Monthly Budget here
                percent,
                color: cat.color || '#cbd5e1'
            };
        }).sort((a, b) => b.spent - a.spent);

        return {
            monthIndex: index,
            monthName,
            spent: data.spent,
            budget: totalBudget,
            rollover: currentRollover,
            available: available - data.spent, // Available REMAINING? Or Available LIMIT?
            // "Available" typically means "How much I can spend".
            // Let's say "Limit" = Budget + Rollover.
            // "Remaining" = Limit - Spent.
            // I'll export "available" as "Limit" (Budget + Rollover).
            items
        };
    });
}
