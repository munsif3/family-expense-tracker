import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserProfile } from '@/types';
import { useTripReturns } from '../hooks/useTripData';
import { Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';

const returnSchema = z.object({
    description: z.string().min(1, "Description is required"),
    amount: z.coerce.number().positive("Amount must be positive"),
    currency: z.string().min(1, "Currency is required"),
    conversionRate: z.coerce.number().positive().default(1),
    receivedBy: z.string().min(1, "Recipient is required"),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date",
    }),
});

type ReturnFormValues = z.infer<typeof returnSchema>;

interface AddTripReturnModalProps {
    tripId: string;
    tripName: string;
    participants: UserProfile[]; // Ensure this includes household members if applicable, or logic to fetch them
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddTripReturnModal({ tripId, participants, open, onOpenChange }: AddTripReturnModalProps) {
    const { user, household } = useAuth();
    const { addReturn, returnsLoading } = useTripReturns(tripId);

    // Custom Input States
    const [isCustomCurrency, setIsCustomCurrency] = useState(false);

    const form = useForm<ReturnFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(returnSchema) as any,
        defaultValues: {
            description: '',
            amount: 0,
            currency: household?.currency || 'USD',
            conversionRate: 1,
            receivedBy: user?.uid || '',
            date: new Date().toISOString().split('T')[0],
        },
    });

    // Combine participants and household members for "Received By"
    // Assuming 'participants' passed from parent might already include relevant people, 
    // but good to ensure current user is in the list if not.
    // Ideally, the parent passes a comprehensive list. For now, rely on `participants`.

    const onSubmit = async (data: ReturnFormValues) => {
        try {
            await addReturn({
                ...data,
                date: Timestamp.fromDate(new Date(data.date)),
                tripId,
                baseAmount: data.amount * data.conversionRate,
            });
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to add return:", error);
        }
    };

    const handleCurrencyChange = (val: string) => {
        if (val === 'other') {
            setIsCustomCurrency(true);
            form.setValue('currency', '');
        } else {
            setIsCustomCurrency(false);
            form.setValue('currency', val);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Return / Refund</DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" {...form.register('date')} />
                            {form.formState.errors.date && <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input type="number" step="0.01" {...form.register('amount')} />
                            {form.formState.errors.amount && <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            {!isCustomCurrency ? (
                                <Select
                                    onValueChange={handleCurrencyChange}
                                    defaultValue={form.getValues('currency')}
                                    // eslint-disable-next-line react-hooks/incompatible-library
                                    value={!['USD', 'EUR', 'GBP', 'INR', 'AED'].includes(form.watch('currency')) && form.watch('currency') !== '' ? 'other' : form.watch('currency')}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                        <SelectItem value="EUR">EUR (€)</SelectItem>
                                        <SelectItem value="GBP">GBP (£)</SelectItem>
                                        <SelectItem value="INR">INR (₹)</SelectItem>
                                        <SelectItem value="AED">AED</SelectItem>
                                        <SelectItem value="other">Other...</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="CODE"
                                        className="uppercase"
                                        {...form.register('currency')}
                                        autoFocus
                                    />
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsCustomCurrency(false)}>X</Button>
                                </div>
                            )}
                            {form.formState.errors.currency && <p className="text-sm text-red-500">{form.formState.errors.currency.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Ex. Rate (to Base)</Label>
                            <Input type="number" step="0.0001" {...form.register('conversionRate')} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Received By</Label>
                        <Select onValueChange={(val) => form.setValue('receivedBy', val)} defaultValue={form.getValues('receivedBy')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select recipient" />
                            </SelectTrigger>
                            <SelectContent>
                                {participants.map((p) => (
                                    <SelectItem key={p.uid} value={p.uid}>
                                        {p.displayName || p.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.formState.errors.receivedBy && <p className="text-sm text-red-500">{form.formState.errors.receivedBy.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input placeholder="Refund description..." {...form.register('description')} />
                        {form.formState.errors.description && <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={returnsLoading}>
                            {returnsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Add Return'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
