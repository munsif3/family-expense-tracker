'use client';
import { useBudget } from '@/features/budget/useBudget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetProgressBar } from '@/components/ui/budget-progress-bar';
import { Button } from '@/components/ui/button';
import { Edit2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency, cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState } from 'react';
import { RecalculateBudgetsButton } from '@/features/budget/components/RecalculateBudgetsButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function BudgetPage() {
    const {
        budgetStatus, // Annual
        monthlyStatus,
        categories,
        loading,
        currency,
        editMode,
        setEditMode,
        localBudgets,
        setLocalBudgets,
        openEditModal,
        handleSaveBudgets,
        selectedYear,
        setSelectedYear
    } = useBudget();

    const [expandedMonth, setExpandedMonth] = useState<number | null>(new Date().getMonth());


    if (loading) {
        return <div className="p-8 text-center text-muted-foreground"><LoadingSpinner text="Loading budget data..." /></div>;
    }

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 md:pb-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Budget Planning</h1>
                    <p className="text-muted-foreground mt-1">Manage your spending limits per year</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <RecalculateBudgetsButton year={selectedYear} />

                    <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button onClick={openEditModal} variant="outline" className="gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit Budget
                    </Button>
                </div>
            </div>

            {/* Annual Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Annual Overview ({selectedYear})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6">
                        {budgetStatus.map((item) => (
                            <div key={item.name} className="space-y-1">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="font-semibold text-sm">{item.name}</span>
                                    </div>
                                    <div className="text-xs">
                                        <span className="font-medium">{formatCurrency(item.spent, currency)}</span>
                                        <span className="text-muted-foreground"> / {formatCurrency(item.budgetAnnual, currency)}</span>
                                    </div>
                                </div>
                                <BudgetProgressBar
                                    spent={item.spent}
                                    limit={item.budgetAnnual}
                                    currency={currency}
                                />
                            </div>
                        ))}
                        {budgetStatus.length === 0 && <p className="text-sm text-muted-foreground">No data for this year.</p>}
                    </div>
                </CardContent>
            </Card>

            {/* Monthly Breakdown */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight">Monthly Breakdown</h2>
                <div className="grid gap-4">
                    {monthlyStatus.map((month) => {
                        const isExpanded = expandedMonth === month.monthIndex;
                        const isRolloverPositive = month.rollover > 0;
                        const isRolloverNegative = month.rollover < 0;

                        return (
                            <Card key={month.monthIndex} className={cn("overflow-hidden transition-all", isExpanded ? 'ring-2 ring-primary/5' : '')}>
                                <div
                                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setExpandedMonth(isExpanded ? null : month.monthIndex)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="font-semibold w-24">{month.monthName}</div>

                                            {/* Summary Bar */}
                                            <div className="flex-1 max-w-sm hidden sm:block">
                                                <BudgetProgressBar
                                                    spent={month.spent}
                                                    limit={month.available} // Use Available (Budget + Rollover)
                                                    currency={currency}
                                                    className="h-2"
                                                />
                                            </div>

                                            <div className="text-sm text-right min-w-[140px] space-y-0.5">
                                                <div className={month.spent > month.available ? "text-red-500 font-medium" : ""}>
                                                    {formatCurrency(month.spent, currency)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    of {formatCurrency(month.available, currency)}
                                                    {isRolloverPositive && <span className="text-green-600 ml-1">(+{formatCurrency(month.rollover, currency)} roll)</span>}
                                                    {isRolloverNegative && <span className="text-red-600 ml-1">({formatCurrency(month.rollover, currency)} roll)</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                    </div>

                                    {/* Mobile Progress Bar shown below on small screens */}
                                    <div className="mt-2 sm:hidden">
                                        <BudgetProgressBar
                                            spent={month.spent}
                                            limit={month.available}
                                            currency={currency}
                                        />
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 border-t bg-muted/10">
                                        <div className="py-2 text-xs text-muted-foreground flex items-center justify-end gap-2">
                                            <span>Base Budget: {formatCurrency(month.budget, currency)}</span>
                                            <span>+</span>
                                            <span className={isRolloverNegative ? 'text-red-500' : 'text-green-600'}>Rollover: {formatCurrency(month.rollover, currency)}</span>
                                            <span>=</span>
                                            <span className="font-medium text-foreground">Limit: {formatCurrency(month.available, currency)}</span>
                                        </div>

                                        <div className="mt-2 grid gap-3">
                                            {month.items.map(item => (
                                                <div key={item.name} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                        <span>{item.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 flex-1 justify-end max-w-md">
                                                        <div className="w-full max-w-[140px] hidden sm:block">
                                                            <BudgetProgressBar
                                                                spent={item.spent}
                                                                limit={item.budgetAnnual}
                                                                currency={currency}
                                                                className="h-1.5"
                                                            />
                                                        </div>
                                                        <span className="text-xs tabular-nums text-right w-[100px]">
                                                            {formatCurrency(item.spent, currency)} / {formatCurrency(item.budgetAnnual, currency)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {month.items.length === 0 && <p className="text-xs text-muted-foreground">No spending recorded.</p>}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )
                    })}
                </div>
            </div>

            <Dialog open={editMode} onOpenChange={setEditMode}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit {selectedYear} Monthly Budgets</DialogTitle>
                        <DialogDescription>
                            Set the <strong>monthly</strong> spending limit for each category. This will apply to all months in {selectedYear}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {categories.map((cat) => (
                            <div key={cat.id} className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor={cat.id} className="col-span-2 text-right truncate font-medium">
                                    {cat.name}
                                </Label>
                                <Input
                                    id={cat.id}
                                    type="number"
                                    placeholder="0"
                                    value={localBudgets[cat.id] ?? ''}
                                    onChange={(e) => setLocalBudgets(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                    className="col-span-2"
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditMode(false)}>
                            Cancel
                        </Button>
                        <Button onClick={async () => {
                            const success = await handleSaveBudgets();
                            if (success) {
                                toast.success(`Budgets for ${selectedYear} saved`);
                            } else {
                                toast.error("Failed to save budgets");
                            }
                        }}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
