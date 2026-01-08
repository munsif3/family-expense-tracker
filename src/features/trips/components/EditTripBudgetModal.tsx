'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { tripService } from '@/lib/api/trips';
import { Trip, TripBudget } from '../types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const budgetSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    currency: z.string().min(1, "Currency is required"),
    description: z.string().optional(),
    category: z.string().optional(),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface EditTripBudgetModalProps {
    trip: Trip;
    budget: TripBudget | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onBudgetUpdated?: () => void;
}

export function EditTripBudgetModal({ trip, budget, open, onOpenChange, onBudgetUpdated }: EditTripBudgetModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCustomCurrency, setIsCustomCurrency] = useState(false);

    const { register, handleSubmit, formState: { errors }, setValue, reset, watch } = useForm<BudgetFormData>({
        resolver: zodResolver(budgetSchema),
        defaultValues: {
            amount: 0,
            currency: 'USD',
            description: '',
            category: ''
        }
    });

    const currentCurrency = watch('currency');
    const currentCategory = watch('category');

    useEffect(() => {
        if (budget) {
            reset({
                amount: budget.amount,
                currency: budget.currency,
                description: budget.description,
                category: budget.category || ''
            });

            // Check if currency is standard
            const standardCurrencies = ['USD', 'EUR', 'AED', 'LKR', 'GBP'];
            if (!standardCurrencies.includes(budget.currency)) {
                setIsCustomCurrency(true);
            } else {
                setIsCustomCurrency(false);
            }
        }
    }, [budget, reset]);

    const onSubmit = async (data: BudgetFormData) => {
        if (!budget) return;

        setIsSubmitting(true);
        try {
            const updatedBudget: TripBudget = {
                ...budget,
                amount: data.amount,
                currency: data.currency,
                description: data.description || '',
                ...(data.category ? { category: data.category as any } : { category: undefined })
            };

            // Should remove undefined keys explicitly if spread doesn't work as expected with object updates, 
            // but since we are replacing the object in the array, creating a clean object is best.
            // Actually, if we want to REMOVE the category if it was there and now is empty:
            if (!data.category) {
                delete updatedBudget.category;
            }

            const updatedBudgets = (trip.budgets || []).map(b =>
                b.id === budget.id ? updatedBudget : b
            );

            await tripService.updateTrip(trip.id, {
                budgets: updatedBudgets
            });

            onOpenChange(false);
            if (onBudgetUpdated) onBudgetUpdated();
        } catch (error) {
            console.error("Failed to update budget", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCurrencyChange = (val: string) => {
        if (val === 'custom_currency_entry') {
            setIsCustomCurrency(true);
            setValue('currency', '');
        } else {
            setIsCustomCurrency(false);
            setValue('currency', val);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Budget Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            {...register("amount", { valueAsNumber: true })}
                        />
                        {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        {!isCustomCurrency ? (
                            <Select
                                onValueChange={handleCurrencyChange}
                                value={currentCurrency}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="AED">AED</SelectItem>
                                    <SelectItem value="LKR">LKR</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                    <SelectItem value="custom_currency_entry">Other...</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex gap-2">
                                <Input placeholder="Code" {...register('currency')} className="uppercase" maxLength={3} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => setIsCustomCurrency(false)}>X</Button>
                            </div>
                        )}
                        {errors.currency && <p className="text-red-500 text-xs">{errors.currency.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            placeholder="e.g. Cash for Shopping"
                            {...register("description")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Category (Optional)</Label>
                        <Select
                            onValueChange={(val) => setValue('category', val === 'none' ? '' : val)}
                            value={currentCategory || 'none'}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">General / Uncategorized</SelectItem>
                                <SelectItem value="food">Food</SelectItem>
                                <SelectItem value="transport">Transport</SelectItem>
                                <SelectItem value="travel">Travel</SelectItem>
                                <SelectItem value="accommodation">Accommodation</SelectItem>
                                <SelectItem value="shopping">Shopping</SelectItem>
                                <SelectItem value="attractions">Attractions</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
                            {isSubmitting ? "Updating..." : "Update Budget"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
