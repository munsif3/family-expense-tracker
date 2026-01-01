import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp, collection, getDocs, doc } from 'firebase/firestore';
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
import Link from 'next/link';
import { CATEGORY_CONFIG } from '../constants';

interface EditTripExpenseModalProps {
    tripId: string;
    tripName: string;
    participants: UserProfile[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expense: TripExpense;
}

const expenseSchema = z.object({
    date: z.date(),
    amount: z.number().positive(),
    currency: z.string().min(1),
    conversionRate: z.number().positive(),
    mode: z.string().min(1, "Mode required"),
    paymentMethodId: z.string().optional(),
    paidBy: z.string().min(1, "Payer required"),
    category: z.enum(['food', 'transport', 'travel', 'accommodation', 'shopping', 'tips', 'other']),
    notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export function EditTripExpenseModal({ tripId, tripName, participants: tripParticipants, open, onOpenChange, expense }: EditTripExpenseModalProps) {
    const { user, household } = useAuth();
    const { updateExpense } = useTripExpenses(tripId);

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
                } catch (e) {
                    console.error(e);
                }
                setPmLoading(false);
            }
        };
        if (open) {
            fetchPaymentMethods();
        }
    }, [household?.id, open]);

    const { register, handleSubmit, formState: { errors }, watch, setValue, reset, control } = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            date: expense.date.toDate(),
            amount: expense.amount,
            currency: expense.currency,
            conversionRate: expense.conversionRate,
            mode: expense.mode,
            paymentMethodId: expense.paymentMethodId,
            paidBy: expense.paidBy,
            category: expense.category,
            notes: expense.notes || ''
        }
    });

    // Reset form when expense changes
    useEffect(() => {
        if (expense && open) {
            // Handle custom payer if not in list (simplified logic) or keep simple
            // Handle custom currency
            const isStandardCurrency = ['USD', 'EUR', 'AED', 'LKR', 'GBP'].includes(expense.currency);
            if (!isStandardCurrency) {
                setIsCustomCurrency(true);
            } else {
                setIsCustomCurrency(false);
            }

            // Handle Custom Payer
            const payerExists = availablePayers.some(p => p.uid === expense.paidBy);
            if (!payerExists && householdMembers.length > 0) {
                // Might be custom name? Or user not loaded yet.
                // For now, if paidBy is a valid UID, we assume it's fine. If it's a name, we set custom.
                // But paidBy is typed as string (ref). If it's literally a name, we might need to check logic.
                // Assuming paidBy is UID. If we enabled "Other" as name in Add, we need to handle it.
                // In AddModal, 'other' sets paidBy to custom input name.
                setIsCustomPayer(false); // Default to false unless we detect it's not a UUID?
                // Or we check if it matches any participant ID.
                if (expense.paidBy && !availablePayers.some(p => p.uid === expense.paidBy)) {
                    // It might be a custom name
                    setIsCustomPayer(true);
                }
            }

            reset({
                date: expense.date.toDate(),
                amount: expense.amount,
                currency: expense.currency,
                conversionRate: expense.conversionRate,
                mode: expense.mode,
                paymentMethodId: expense.paymentMethodId,
                paidBy: expense.paidBy,
                category: expense.category,
                notes: expense.notes || ''
            });
        }
    }, [expense, open, reset, availablePayers, householdMembers]);


    const amount = watch('amount');
    const rate = watch('conversionRate');
    const baseAmount = (amount || 0) * (rate || 0);

    const handlePaymentMethodChange = (val: string) => {
        setValue('paymentMethodId', val);
        const method = paymentMethods.find(m => m.id === val);
        if (method) {
            setValue('mode', method.type);
        }
    };

    const onSubmit = async (data: ExpenseFormData) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            // 1. Update Expense
            await updateExpense(expense.id, {
                date: Timestamp.fromDate(data.date),
                amount: data.amount,
                currency: data.currency,
                conversionRate: data.conversionRate,
                baseAmount: baseAmount,
                mode: data.mode,
                paymentMethodId: data.paymentMethodId,
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

            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update expense", error);
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
                    <DialogTitle>Edit Expense</DialogTitle>
                    <DialogDescription>Modify trip expense details.</DialogDescription>
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
                            <Controller
                                control={control}
                                name="category"
                                render={({ field }) => (
                                    <Select onValueChange={(val) => field.onChange(val as ExpenseCategory)} value={field.value}>
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
                                )}
                            />
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
                                <Controller
                                    control={control}
                                    name="currency"
                                    render={({ field }) => (
                                        <Select onValueChange={handleCurrencyChange} value={field.value}>
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
                                    )}
                                />
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
                                <Controller
                                    control={control}
                                    name="paidBy"
                                    render={({ field }) => (
                                        <Select onValueChange={handlePayerChange} value={field.value}>
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
                                    )}
                                />
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
                        <Controller
                            control={control}
                            name="paymentMethodId"
                            render={({ field }) => (
                                <Select onValueChange={handlePaymentMethodChange} value={field.value}>
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
                            )}
                        />
                        <input type="hidden" {...register('mode')} />
                    </div>

                    <div className="p-2 bg-muted rounded text-sm text-center">
                        Base Amount: <span className="font-bold">{baseAmount.toFixed(2)}</span>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Save Changes" : "Save Changes"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
