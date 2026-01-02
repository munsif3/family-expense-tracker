'use client';

import { useState } from 'react';
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
import { UserProfile } from '@/types';

const fundSchema = z.object({
    date: z.string(),
    contributorId: z.string().min(1, "Contributor required"),
    mode: z.string().min(1, "Mode required"),
    amount: z.number().positive(),
    currency: z.string().min(1),
    conversionRate: z.number().positive(),
    source: z.enum(['exchange', 'asset']),
    exchangeLocation: z.string().optional(),
    country: z.string().optional(),
    isPfc: z.boolean().optional(),
    pfcOwnerId: z.string().optional(),
    isReimbursed: z.boolean().optional(),
    reimbursedBy: z.string().optional(),
    reimbursementAmount: z.number().optional(),
});

type FundFormData = z.infer<typeof fundSchema>;

interface AddTripFundModalProps {
    tripId: string;
    participants: UserProfile[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddTripFundModal({ tripId, participants: tripParticipants, open, onOpenChange }: AddTripFundModalProps) {
    const { addFund } = useTripFunds(tripId);
    const { household } = useAuth();
    // Fetch all household members
    const { participants: householdMembers } = useTripParticipants(household?.memberIds || []);

    // Combine lists effectively - prefer household members as they might have more data, but fall back to input participants
    // Actually, householdMembers should suffice if loaded. 
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
            exchangeLocation: '',
            country: '',
            isPfc: false,
            pfcOwnerId: '',
            isReimbursed: false,
            reimbursedBy: '',
            reimbursementAmount: 0,
        }
    });

    const amount = watch('amount');
    const rate = watch('conversionRate');
    const baseAmount = (amount || 0) * (rate || 0);

    const onSubmit = async (data: FundFormData) => {
        setIsSubmitting(true);
        try {
            await addFund({
                tripId,
                date: Timestamp.fromDate(new Date(data.date)),
                contributorId: data.contributorId,
                mode: data.mode,
                amount: data.amount,
                currency: data.currency,
                conversionRate: data.conversionRate,
                baseAmount: data.amount * data.conversionRate,
                source: data.source,
                ...(data.source === 'exchange' ? {
                    exchangeLocation: data.exchangeLocation,
                    country: data.country
                } : {}),

                // PFC Fields
                ...(data.source === 'asset' && data.isPfc ? {
                    isPfc: true,
                    pfcOwnerId: data.pfcOwnerId,
                    isReimbursed: data.isReimbursed,
                    reimbursedBy: data.reimbursedBy,
                    reimbursementAmount: data.reimbursementAmount
                } : {})
            });

            // Allow immediate adding of another? No, close for now.
            // Reset custom states
            setIsCustomContributor(false);
            setIsCustomMode(false);
            setIsCustomCurrency(false);

            reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to add fund", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContributorChange = (val: string) => {
        if (val === 'other') {
            setIsCustomContributor(true);
            setValue('contributorId', ''); // Clear so user must type
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
                    <DialogTitle>Add Travel Fund</DialogTitle>
                    <DialogDescription>Record money added to the trip pot.</DialogDescription>
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
                                <Select onValueChange={handleContributorChange}>
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
                                <Select onValueChange={handleModeChange} defaultValue="card">
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
                            <Label>Fund Source</Label>
                            <div className="flex bg-muted rounded-md p-1">
                                <Button
                                    type="button"
                                    variant={watch('source') === 'asset' ? 'secondary' : 'ghost'}
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => setValue('source', 'asset')}
                                >
                                    From Savings/Asset
                                </Button>
                                <Button
                                    type="button"
                                    variant={watch('source') === 'exchange' ? 'secondary' : 'ghost'}
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => setValue('source', 'exchange')}
                                >
                                    Bought (Exchange)
                                </Button>
                            </div>
                        </div>
                    </div>

                    {watch('source') === 'asset' && (
                        <div className="space-y-4 border p-3 rounded-md bg-muted/20">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isPfc"
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    {...register('isPfc')}
                                />
                                <Label htmlFor="isPfc" className="font-medium">From Personal Foreign Currency Account?</Label>
                            </div>

                            {watch('isPfc') && (
                                <div className="space-y-4 pl-6 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="space-y-2">
                                        <Label htmlFor="pfcOwnerId">Account Owner</Label>
                                        <Select onValueChange={(val) => setValue('pfcOwnerId', val)} defaultValue={household?.memberIds?.[0]}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Owner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {householdMembers.map(user => (
                                                    <SelectItem key={user.uid} value={user.uid}>{user.displayName || user.email}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center space-x-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="isReimbursed"
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            {...register('isReimbursed')}
                                        />
                                        <Label htmlFor="isReimbursed">Was this reimbursed?</Label>
                                    </div>

                                    {watch('isReimbursed') && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="reimbursedBy">Paid By (in {household?.currency})</Label>
                                                <Select onValueChange={(val) => setValue('reimbursedBy', val)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Payer" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {householdMembers.map(user => (
                                                            <SelectItem key={user.uid} value={user.uid}>{user.displayName || user.email}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="reimbursementAmount">Amount ({household?.currency})</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...register('reimbursementAmount', { valueAsNumber: true })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

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
                                    <p className="text-xs text-muted-foreground text-right mt-1">
                                        Rate: {watch('conversionRate')?.toFixed(4)}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Label htmlFor="rate">Valuation Rate (to Base)</Label>
                                    <Input
                                        key="input-valuation-rate"
                                        id="rate"
                                        type="number"
                                        step="0.0001"
                                        {...register("conversionRate", { valueAsNumber: true })}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {watch('source') === 'exchange' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="exchangeLocation">Exchange/Bank Name</Label>
                                <Input
                                    id="exchangeLocation"
                                    placeholder="e.g. Al Ansari"
                                    {...register("exchangeLocation")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Input
                                    id="country"
                                    placeholder="e.g. UAE"
                                    {...register("country")}
                                />
                            </div>
                        </div>
                    )}

                    <div className="p-2 bg-muted rounded text-sm text-center">
                        Base Amount: <span className="font-bold">{baseAmount.toFixed(2)}</span>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Fund"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
