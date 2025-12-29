'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { Controller } from 'react-hook-form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTripExpenses } from '../hooks/useTripData';
import { syncTripExpensesToMainTracker } from '../hooks/useTripCalculations'; // Hook might be used? No lint said unused.

import { UserProfile } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { ExpenseCategory, TripExpense } from '../types';

const expenseSchema = z.object({
    date: z.date(),
    amount: z.number().positive(),
    currency: z.string().min(1),
    conversionRate: z.number().positive(),
    mode: z.string().min(1, "Mode required"),
    paidBy: z.string().min(1, "Payer required"),
    category: z.enum(['food', 'transport', 'travel', 'accommodation', 'shopping', 'tips', 'other']),
    notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface AddTripExpenseModalProps {
    tripId: string;
    tripName: string;
    participants: UserProfile[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

import { useTripParticipants } from '../hooks/useTripParticipants';

export function AddTripExpenseModal({ tripId, tripName, participants: tripParticipants, open, onOpenChange }: AddTripExpenseModalProps) {
    const { user, household } = useAuth();
    const { addExpense } = useTripExpenses(tripId);

    // Fetch all household members
    const { participants: householdMembers } = useTripParticipants(household?.memberIds || []);
    const availablePayers = householdMembers.length > 0 ? householdMembers : tripParticipants;

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Custom inputs state
    const [isCustomPayer, setIsCustomPayer] = useState(false);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [isCustomCurrency, setIsCustomCurrency] = useState(false);

    const { register, handleSubmit, formState: { errors }, watch, setValue, reset, control } = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            date: new Date(),
            mode: 'card',
            currency: 'USD',
            conversionRate: 1,
            category: 'food'
        }
    });

    const amount = watch('amount');
    const rate = watch('conversionRate');
    const baseAmount = (amount || 0) * (rate || 0);

    const onSubmit = async (data: ExpenseFormData) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            // 1. Add Expense
            await addExpense({
                tripId,
                date: Timestamp.fromDate(data.date),
                amount: data.amount,
                currency: data.currency,
                conversionRate: data.conversionRate,
                baseAmount: baseAmount,
                mode: data.mode,
                paidBy: data.paidBy,
                category: data.category as ExpenseCategory,
                notes: data.notes
            });

            // 2. Fetch all expenses to update aggregation
            const querySnapshot = await getDocs(collection(db, 'trips', tripId, 'expenses'));
            const allExpenses = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as (TripExpense & { id: string })[];

            // 3. Sync
            await syncTripExpensesToMainTracker(
                tripId,
                tripName,
                allExpenses,
                user.uid,
                household?.id
            );

            // Reset custom states
            setIsCustomPayer(false);
            setIsCustomMode(false);
            setIsCustomCurrency(false);

            reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to add expense", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePayerChange = (val: string) => {
        if (val === 'other') {
            setIsCustomPayer(true);
            setValue('paidBy', '');
        } else {
            setIsCustomPayer(false);
            setValue('paidBy', val);
        }
    };

    const handleModeChange = (val: string) => {
        if (val === 'custom_mode_entry') {
            setIsCustomMode(true);
            setValue('mode', '');
        } else {
            setIsCustomMode(false);
            setValue('mode', val);
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
            <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Add Expense</DialogTitle>
                    <DialogDescription>Track a trip expense.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 flex flex-col">
                            <Label htmlFor="date">Date</Label>
                            <Controller
                                control={control}
                                name="date"
                                render={({ field }) => (
                                    <DatePicker date={field.value} setDate={field.onChange} />
                                )}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select onValueChange={(val) => setValue('category', val as ExpenseCategory)} defaultValue="food">
                                <SelectTrigger>
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="food">Food</SelectItem>
                                    <SelectItem value="transport">Transport</SelectItem>
                                    <SelectItem value="travel">Travel</SelectItem>
                                    <SelectItem value="accommodation">Accommodation</SelectItem>
                                    <SelectItem value="shopping">Shopping</SelectItem>
                                    <SelectItem value="tips">Tips</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Description / Notes</Label>
                        <Textarea id="notes" placeholder="Dinner at..." {...register("notes")} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rate">Exchange Rate</Label>
                            <Input
                                id="rate"
                                type="number"
                                step="0.0001"
                                {...register("conversionRate", { valueAsNumber: true })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paidBy">Paid By</Label>
                            {!isCustomPayer ? (
                                <Select onValueChange={handlePayerChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availablePayers.map(user => (
                                            <SelectItem key={user.uid} value={user.uid}>{user.displayName || user.email}</SelectItem>
                                        ))}
                                        <SelectItem value="other">Other (Custom)</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex gap-2">
                                    <Input placeholder="Enter name" {...register('paidBy')} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsCustomPayer(false)}>X</Button>
                                </div>
                            )}
                            {errors.paidBy && <p className="text-red-500 text-xs">{errors.paidBy.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="mode">Payment Mode</Label>
                        {!isCustomMode ? (
                            <Select onValueChange={handleModeChange} defaultValue="card">
                                <SelectTrigger>
                                    <SelectValue placeholder="Mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="usd_cash">USD Cash</SelectItem>
                                    <SelectItem value="eur_cash">EUR Cash</SelectItem>
                                    <SelectItem value="aed_cash">AED Cash</SelectItem>
                                    <SelectItem value="custom_mode_entry">Other...</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex gap-2">
                                <Input placeholder="e.g. Bank Transfer" {...register('mode')} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => setIsCustomMode(false)}>X</Button>
                            </div>
                        )}
                    </div>

                    <div className="p-2 bg-muted rounded text-sm text-center">
                        Base Amount: <span className="font-bold">{baseAmount.toFixed(2)}</span>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Expense"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
