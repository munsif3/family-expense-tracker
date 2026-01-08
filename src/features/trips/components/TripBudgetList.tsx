'use client';

import { Trip, TripBudget } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { tripService } from '@/lib/api/trips';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface TripBudgetListProps {
    trip: Trip;
    onUpdate?: () => void;
    onEdit?: (budget: TripBudget) => void;
}

export function TripBudgetList({ trip, onUpdate, onEdit }: TripBudgetListProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this budget item?')) return;
        setDeletingId(id);
        try {
            const updatedBudgets = (trip.budgets || []).filter(b => b.id !== id);
            await tripService.updateTrip(trip.id, { budgets: updatedBudgets });
            if (onUpdate) onUpdate();
        } catch (e) {
            console.error(e);
        } finally {
            setDeletingId(null);
        }
    };

    // Graph traversal helper (BFS) to find converted values
    const getConvertedValues = (amount: number, fromCurrency: string, rates: Record<string, number>) => {
        const adj: Record<string, Record<string, number>> = {};
        Object.entries(rates).forEach(([key, rate]) => {
            const [src, dst] = key.split('-');
            if (!adj[src]) adj[src] = {};
            if (!adj[dst]) adj[dst] = {};
            adj[src][dst] = rate;
            adj[dst][src] = 1 / rate;
        });

        const results: { currency: string, value: number }[] = [];
        const visited = new Set<string>();
        const queue: { curr: string, rate: number }[] = [{ curr: fromCurrency, rate: 1 }];
        visited.add(fromCurrency);

        while (queue.length > 0) {
            const { curr, rate } = queue.shift()!;

            // Add neighbor conversions
            if (adj[curr]) {
                Object.entries(adj[curr]).forEach(([neighbor, neighborRate]) => {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        const totalRate = rate * neighborRate;
                        results.push({ currency: neighbor, value: amount * totalRate });
                        queue.push({ curr: neighbor, rate: totalRate });
                    }
                });
            }
        }
        return results;
    };

    if (!trip.budgets || trip.budgets.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No budget items added yet. Set up your tentative budget to track deviations.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {trip.budgets.map((budget) => {
                const conversions = getConvertedValues(budget.amount, budget.currency, trip.budgetRates || {});

                return (
                    <Card key={budget.id}>
                        <CardContent className="p-4 flex justify-between items-start">
                            <div className="flex-1">
                                <div className="font-bold text-lg flex items-center gap-2">
                                    {formatCurrency(budget.amount, budget.currency)}
                                    {conversions.length > 0 && (
                                        <span className="text-sm font-normal text-muted-foreground flex items-center">
                                            ({conversions.map(c =>
                                                `${c.currency} ${c.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            ).join(' | ')})
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {budget.description || 'No description'}
                                    {budget.category && <span className="ml-2 px-2 py-0.5 bg-secondary rounded-full text-xs capitalize">{budget.category}</span>}
                                </div>
                            </div>
                            <div className="flex gap-1">
                                {onEdit && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(budget)}
                                    >
                                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDelete(budget.id)}
                                    disabled={deletingId === budget.id}
                                >
                                    {deletingId === budget.id ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
