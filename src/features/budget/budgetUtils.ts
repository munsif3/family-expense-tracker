import { Transaction, Category } from '@/types';
import { getYear, getMonth } from 'date-fns';
import { toJsDate } from '@/lib/utils';

export interface BudgetStatusItem {
    name: string;
    id: string | undefined;
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
    items: BudgetStatusItem[];
}

/**
 * Calculates the annual budget status for the selected year.
 */
export function calculateAnnualStatus(
    transactions: Transaction[],
    categories: Category[],
    selectedYear: number
): BudgetStatusItem[] {
    const annualSpendMap: Record<string, number> = {};

    // Filter by year first
    transactions.forEach(t => {
        const date = toJsDate(t.date);
        if (getYear(date) !== selectedYear) return;

        const name = t.categoryName || 'Other';
        annualSpendMap[name] = (annualSpendMap[name] || 0) + t.amount;
    });

    const allNames = new Set([...Object.keys(annualSpendMap), ...categories.map(c => c.name)]);

    return Array.from(allNames).map((name): BudgetStatusItem => {
        const cat = categories.find(c => c.name === name);
        const spent = annualSpendMap[name] || 0;

        // Get monthly budget: check year override first, then fall back to default
        let budgetMonthly = cat?.budgets?.[selectedYear] ?? cat?.budgetMonthly ?? 0;

        const budgetAnnual = budgetMonthly * 12;
        const percent = budgetAnnual > 0 ? (spent / budgetAnnual) * 100 : (spent > 0 ? 100 : 0);

        return {
            name,
            id: cat?.id,
            spent,
            budgetAnnual,
            percent,
            color: cat?.color || '#cbd5e1'
        };
    }).sort((a, b) => b.spent - a.spent);
}

/**
 * Calculates the month-by-month budget breakdown for the selected year.
 */
export function calculateMonthlyStatus(
    transactions: Transaction[],
    categories: Category[],
    selectedYear: number
): MonthlyStatusItem[] {
    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(selectedYear, i, 1);
        return {
            index: i,
            name: date.toLocaleString('default', { month: 'long' })
        };
    });

    return months.map(({ index, name: monthName }): MonthlyStatusItem => {
        // Filter transactions for this month and year
        const monthTransactions = transactions.filter(t => {
            const date = toJsDate(t.date);
            return getYear(date) === selectedYear && getMonth(date) === index;
        });

        const monthSpendMap: Record<string, number> = {};
        let totalSpent = 0;
        monthTransactions.forEach(t => {
            const catName = t.categoryName || 'Other';
            monthSpendMap[catName] = (monthSpendMap[catName] || 0) + t.amount;
            totalSpent += t.amount;
        });

        // Use all category names to ensure consistent rows, or just active ones?
        // Logic from original hook used allNames derived from yearTransactions + categories
        // But here we need to re-derive purely for this context or pass it in?
        // Original logic re-derived `allNames` inside the loop implicitly by iterating over `allNames` from outer scope.
        // To keep it pure, let's derive distinct names for this month + all categories.
        const allNames = new Set([...Object.keys(monthSpendMap), ...categories.map(c => c.name)]);

        const items = Array.from(allNames).map((name): BudgetStatusItem => {
            const cat = categories.find(c => c.name === name);
            const spent = monthSpendMap[name] || 0;

            // Monthly budget for this category
            const budgetMonthly = cat?.budgets?.[selectedYear] ?? cat?.budgetMonthly ?? 0;
            const percent = budgetMonthly > 0 ? (spent / budgetMonthly) * 100 : (spent > 0 ? 100 : 0);

            return {
                name,
                id: cat?.id,
                spent,
                budgetAnnual: budgetMonthly, // Reusing field name for monthly budget
                percent,
                color: cat?.color || '#cbd5e1'
            };
        }).sort((a, b) => b.spent - a.spent);

        // Calculate total budget for the month (sum of all category budgets)
        const totalBudget = categories.reduce((acc, cat) => {
            return acc + (cat?.budgets?.[selectedYear] ?? cat?.budgetMonthly ?? 0);
        }, 0);

        return {
            monthIndex: index,
            monthName,
            spent: totalSpent,
            budget: totalBudget,
            items
        };
    });
}
