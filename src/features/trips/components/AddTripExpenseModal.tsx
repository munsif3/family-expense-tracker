import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTripExpenses } from '../hooks/useTripData';
import { syncTripExpensesToMainTracker } from '../hooks/useTripCalculations';

import { UserProfile, PaymentMethod } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { ExpenseCategory, TripExpense } from '../types';
import { useTripParticipants } from '../hooks/useTripParticipants';
import { paymentMethodService } from '@/lib/api/paymentMethods';
import { CATEGORY_CONFIG } from '../constants';
import Link from 'next/link';

interface AddTripExpenseModalProps {
    tripId: string;
    tripName: string;
    participants: UserProfile[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type ExpenseFormData = z.infer<typeof expenseSchema>;

const expenseSchema = z.object({
    date: z.date(),
    amount: z.number().positive(),
    currency: z.string().min(1),
    conversionRate: z.number().positive(),
    mode: z.string().min(1, "Mode required"),
    paymentMethodId: z.string().optional(),
    paidBy: z.string().min(1, "Payer required"),
    category: z.enum(['food', 'transport', 'travel', 'accommodation', 'shopping', 'tips', 'communication', 'attractions', 'other']),
    notes: z.string().optional(),
});

// ... inside component

export function AddTripExpenseModal({ tripId, tripName, participants: tripParticipants, open, onOpenChange }: AddTripExpenseModalProps) {
    const { user, household } = useAuth();
    const { addExpense } = useTripExpenses(tripId);

    // Fetch all household members
    const { participants: householdMembers } = useTripParticipants(household?.memberIds || []);
    const availablePayers = householdMembers.length > 0 ? householdMembers : tripParticipants;

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Custom inputs state
    const [isCustomPayer, setIsCustomPayer] = useState(false);
    const [isCustomCurrency, setIsCustomCurrency] = useState(false);

    // Fetch Payment Methods
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [pmLoading, setPmLoading] = useState(false);

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            if (household?.id) {
                setPmLoading(true);
                try {
                    const methods = await paymentMethodService.getPaymentMethods(household.id);
                    setPaymentMethods(methods);
                } catch (e) { console.error(e); }
                setPmLoading(false);
            }
        };
        if (open) {
            fetchPaymentMethods();
        }
    }, [household?.id, open]);

    const { register, handleSubmit, formState: { errors, isDirty }, watch, setValue, reset, control } = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            date: new Date(),
            mode: 'card',
            currency: 'USD',
            conversionRate: 1,
            category: 'food',
            paidBy: ''
        }
    });

    // Reset form when modal opens
    useEffect(() => {
        if (open) {
            reset({
                date: new Date(),
                mode: 'card',
                currency: 'USD',
                conversionRate: 1,
                category: 'food',
                paidBy: '',
                amount: undefined,
                paymentMethodId: undefined,
                notes: ''
            });
            setIsCustomCurrency(false);
            setIsCustomPayer(false);
        }
    }, [open, reset]);

    // Apply smart defaults from context
    useEffect(() => {
        if (open && !isDirty) {
            const common = ['USD', 'EUR', 'AED', 'LKR', 'GBP'];
            if (household?.currency) {
                setValue('currency', household.currency);
                setIsCustomCurrency(!common.includes(household.currency));
            }
            if (user?.uid) {
                setValue('paidBy', user.uid);
            }
        }
    }, [open, household, user, isDirty, setValue]);

    const amount = watch('amount');
    const rate = watch('conversionRate');
    const baseAmount = (amount || 0) * (rate || 0);

    // Effect to update mode if payment method is selected (if we want to map them) or purely rely on method ID
    const handlePaymentMethodChange = (val: string) => {
        setValue('paymentMethodId', val);
        const method = paymentMethods.find(m => m.id === val);
        if (method) {
            setValue('mode', method.type); // Map known types: credit_card -> card, etc.
        }
    };

    // Reverse map: allow mode selection if "Other" or generic? 
    // The user wants configured methods.

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
                mode: data.mode, // Still store generic mode
                paymentMethodId: data.paymentMethodId, // Store specific method ID
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
                    {/* ... Date and Category ... */}
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
                                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                                        const Icon = config.icon;
                                        return (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`h-4 w-4 ${config.color}`} />
                                                    <span>{config.label}</span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
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
                        <div className="flex justify-between">
                            <Label>Payment Method</Label>
                            {paymentMethods.length === 0 && !pmLoading && (
                                <Link href="/settings" className="text-xs text-blue-600 hover:underline" onClick={() => onOpenChange?.(false)}>
                                    + Add Method
                                </Link>
                            )}
                        </div>
                        <Select onValueChange={handlePaymentMethodChange}>
                            <SelectTrigger>
                                <SelectValue placeholder={pmLoading ? "Loading..." : "Select Method"} />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethods.map(method => (
                                    <SelectItem key={method.id} value={method.id}>
                                        {method.name} ({method.type.replace('_', ' ')})
                                    </SelectItem>
                                ))}
                                <SelectItem value="cash_generic">Cash (Unspecified)</SelectItem>
                                <SelectItem value="other_generic">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        {/* Hidden generic mode field or we can show it as confirm? For now, we auto-set it */}
                        <input type="hidden" {...register('mode')} />
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
