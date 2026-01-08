'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { v4 as uuidv4 } from 'uuid';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const budgetSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    currency: z.string().min(1, "Currency is required"),
    description: z.string().optional(),
    category: z.string().optional(), // Make generic string to handle 'other' or predefined
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface AddTripBudgetModalProps {
    trip: Trip;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onBudgetAdded?: () => void; // Callback to refresh trip data if needed
}

export function AddTripBudgetModal({ trip, open, onOpenChange, onBudgetAdded }: AddTripBudgetModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCustomCurrency, setIsCustomCurrency] = useState(false);

    const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<BudgetFormData>({
        resolver: zodResolver(budgetSchema),
        defaultValues: {
            amount: 0,
            currency: 'USD',
            description: '',
            category: ''
        }
    });

    const onSubmit = async (data: BudgetFormData) => {
        setIsSubmitting(true);
        try {
            const newBudget: TripBudget = {
                id: uuidv4(),
                amount: data.amount,
                currency: data.currency,
                description: data.description || '',
                ...(data.category ? { category: data.category as any } : {})
            };

            const updatedBudgets = [...(trip.budgets || []), newBudget];

            await tripService.updateTrip(trip.id, {
                budgets: updatedBudgets
            });

            reset();
            onOpenChange(false);
            if (onBudgetAdded) onBudgetAdded();
        } catch (error) {
            console.error("Failed to add budget", error);
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
                    <DialogTitle>Add Budget Item</DialogTitle>
                    <DialogDescription>Add a planned expense amount for this trip.</DialogDescription>
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
                            <Select onValueChange={handleCurrencyChange} defaultValue="USD">
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
                        <Select onValueChange={(val) => setValue('category', val === 'none' ? '' : val)}>
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
                            {isSubmitting ? "Adding..." : "Add Budget"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
