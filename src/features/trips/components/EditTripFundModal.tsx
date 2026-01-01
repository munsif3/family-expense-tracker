'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp } from 'firebase/firestore';
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
import { useTripFunds } from '../hooks/useTripData';
import { useAuth } from '@/features/auth/AuthContext';
import { useTripParticipants } from '../hooks/useTripParticipants';
import { UserProfile, TripFund } from '@/types';

const fundSchema = z.object({
    date: z.string(),
    contributorId: z.string().min(1, "Contributor required"),
    mode: z.string().min(1, "Mode required"),
    amount: z.number().positive(),
    currency: z.string().min(1),
    conversionRate: z.number().positive(),
    source: z.enum(['exchange', 'asset']),
});

type FundFormData = z.infer<typeof fundSchema>;

interface EditTripFundModalProps {
    tripId: string;
    fund: TripFund | null;
    participants: UserProfile[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditTripFundModal({ tripId, fund, participants: tripParticipants, open, onOpenChange }: EditTripFundModalProps) {
    const { updateFund } = useTripFunds(tripId);
    const { household } = useAuth();
    const { participants: householdMembers } = useTripParticipants(household?.memberIds || []);
    const availableContributors = householdMembers.length > 0 ? householdMembers : tripParticipants;

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Custom inputs state
    const [isCustomContributor, setIsCustomContributor] = useState(false);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [isCustomCurrency, setIsCustomCurrency] = useState(false);

    const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<FundFormData>({
        resolver: zodResolver(fundSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            mode: 'card',
            currency: 'USD',
            conversionRate: 1,
            source: 'asset',
        }
    });

    useEffect(() => {
        if (open && fund) {
            let dateStr = new Date().toISOString().split('T')[0];
            try {
                if (fund.date && fund.date.toDate) {
                    dateStr = fund.date.toDate().toISOString().split('T')[0];
                }
            } catch (e) { console.error("Date parse error", e); }

            setValue('date', dateStr);
            setValue('contributorId', fund.contributorId);
            setValue('mode', fund.mode);
            setValue('amount', fund.amount);
            setValue('currency', fund.currency);
            setValue('currency', fund.currency);
            setValue('conversionRate', fund.conversionRate);
            setValue('source', fund.source || 'asset');

            // Check for custom values
            if (!['card', 'cash', 'transfer', 'usd_cash', 'eur_cash', 'aed_cash'].includes(fund.mode)) {
                // Keep legacy ones as known for now so they don't jump to "other" input immediately unless we want them to
                setIsCustomMode(true);
            } else {
                setIsCustomMode(false);
            }

            // Check custom currency - simple check
            if (!['USD', 'EUR', 'AED', 'LKR', 'GBP'].includes(fund.currency)) {
                setIsCustomCurrency(true);
            } else {
                setIsCustomCurrency(false);
            }

            // Check custom contributor - if not in available list
            const inList = availableContributors.find(p => p.uid === fund.contributorId);
            if (!inList) {
                setIsCustomContributor(true);
            } else {
                setIsCustomContributor(false);
            }
        }
    }, [open, fund, setValue, availableContributors]);


    const amount = watch('amount');
    const rate = watch('conversionRate');
    const baseAmount = (amount || 0) * (rate || 0);

    const onSubmit = async (data: FundFormData) => {
        if (!fund) return;

        setIsSubmitting(true);
        try {
            await updateFund(fund.id, {
                date: Timestamp.fromDate(new Date(data.date)),
                contributorId: data.contributorId,
                mode: data.mode,
                amount: data.amount,
                currency: data.currency,
                conversionRate: data.conversionRate,
                baseAmount: data.amount * data.conversionRate,
                source: data.source,
            });

            reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update fund", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContributorChange = (val: string) => {
        if (val === 'other') {
            setIsCustomContributor(true);
            setValue('contributorId', '');
        } else {
            setIsCustomContributor(false);
            setValue('contributorId', val);
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Travel Fund</DialogTitle>
                    <DialogDescription>Update fund details.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" {...register("date")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contributor">Contributor</Label>
                            {!isCustomContributor ? (
                                <Select onValueChange={handleContributorChange} value={watch('contributorId')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableContributors.map(user => (
                                            <SelectItem key={user.uid} value={user.uid}>{user.displayName || user.email}</SelectItem>
                                        ))}
                                        <SelectItem value="other">Other (Custom)</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex gap-2">
                                    <Input placeholder="Enter name" {...register('contributorId')} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsCustomContributor(false)}>X</Button>
                                </div>
                            )}
                            {errors.contributorId && <p className="text-red-500 text-xs">{errors.contributorId.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="mode">Mode</Label>
                            {!isCustomMode ? (
                                <Select onValueChange={handleModeChange} value={watch('mode')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="card">Card</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="custom_mode_entry">Other...</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex gap-2">
                                    <Input placeholder="e.g. PayPal" {...register('mode')} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsCustomMode(false)}>X</Button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency">Currency</Label>
                            {!isCustomCurrency ? (
                                <Select onValueChange={handleCurrencyChange} value={watch('currency')}>
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

                    <div className="space-y-2">
                        <Label>Fund Source</Label>
                        <div className="flex bg-muted rounded-md p-1 w-full">
                            <Button
                                type="button"
                                variant={watch('source') === 'asset' ? 'secondary' : 'ghost'}
                                className="flex-1 h-8 text-xs"
                                onClick={() => setValue('source', 'asset')}
                            >
                                From Savings
                            </Button>
                            <Button
                                type="button"
                                variant={watch('source') === 'exchange' ? 'secondary' : 'ghost'}
                                className="flex-1 h-8 text-xs"
                                onClick={() => setValue('source', 'exchange')}
                            >
                                Exchange
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount {watch('currency') !== 'Base' && `(${watch('currency')})`}</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                {...register("amount", { valueAsNumber: true })}
                            />
                            {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
                        </div>
                        <div className="space-y-2">
                            {watch('source') === 'exchange' ? (
                                <>
                                    <Label htmlFor="totalCost">Total Cost ({household?.currency || 'Base'})</Label>
                                    <Input
                                        key="input-edit-total-cost"
                                        id="totalCost"
                                        type="number"
                                        step="0.01"
                                        defaultValue={baseAmount ? Number(baseAmount.toFixed(2)) : ''}
                                        placeholder="Total LKR Cost"
                                        onChange={(e) => {
                                            const cost = parseFloat(e.target.value);
                                            const amt = watch('amount');
                                            if (cost && amt) {
                                                setValue('conversionRate', cost / amt);
                                            }
                                        }}
                                    />
                                    <p className="text-xs text-muted-foreground text-right mt-1">
                                        Rate: {watch('conversionRate')?.toFixed(4)}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Label htmlFor="rate">Valuation Rate (to Base)</Label>
                                    <Input
                                        key="input-edit-valuation-rate"
                                        id="rate"
                                        type="number"
                                        step="0.0001"
                                        {...register("conversionRate", { valueAsNumber: true })}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="p-2 bg-muted rounded text-sm text-center">
                        Base Amount: <span className="font-bold">{baseAmount.toFixed(2)}</span>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Update Fund" : "Update Fund"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
