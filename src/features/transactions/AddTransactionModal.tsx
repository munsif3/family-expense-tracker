import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Transaction, UserProfile, PaymentMethod } from '@/types';
import { useAddTransaction } from './useAddTransaction';
import { paymentMethodService } from '@/lib/api/paymentMethods';
import { CATEGORIES } from '@/lib/constants';
import { DatePicker } from '@/components/ui/date-picker';
import { Controller } from 'react-hook-form';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

interface AddTransactionModalProps {
    transactionToEdit?: Transaction;
    open?: boolean; // Controlled open state
    onOpenChange?: (open: boolean) => void;
    defaultDate?: Date;
}

export function AddTransactionModal({ transactionToEdit, open, onOpenChange, defaultDate }: AddTransactionModalProps) {
    const { form, loading, submitTransaction } = useAddTransaction(transactionToEdit, !!open, onOpenChange || (() => { }), defaultDate);

    const selectedType = form.watch('type');
    const filteredCategories = CATEGORIES.filter(c => c.type === selectedType);

    // Fetch household members for "Spent By"
    const { profile } = useAuth();
    const [members, setMembers] = useState<UserProfile[]>([]);
    useEffect(() => {
        const fetchMembers = async () => {
            if (profile?.householdId) {
                try {
                    const q = query(
                        collection(db, 'users'),
                        where('householdId', '==', profile.householdId)
                    );
                    const snapshot = await getDocs(q);
                    setMembers(snapshot.docs.map(d => d.data() as UserProfile));
                } catch (e) { console.error(e); }
            }
        };
        fetchMembers();
    }, [profile?.householdId]);

    // Fetch Payment Methods
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [pmLoading, setPmLoading] = useState(false);

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            if (profile?.householdId) {
                setPmLoading(true);
                try {
                    const methods = await paymentMethodService.getPaymentMethods(profile.householdId);
                    setPaymentMethods(methods);
                } catch (e) { console.error(e); }
                setPmLoading(false);
            }
        };
        fetchPaymentMethods();
    }, [profile?.householdId]);

    // Handle Payment Method Logic
    const selectedPaymentMethodId = form.watch('paymentMethodId');
    useEffect(() => {
        if (selectedPaymentMethodId) {
            const method = paymentMethods.find(m => m.id === selectedPaymentMethodId);
            if (method?.isCommon) {
                form.setValue('isPersonal', false);
            }
        }
    }, [selectedPaymentMethodId, paymentMethods, form]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{transactionToEdit ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(submitTransaction)} className="space-y-4 pt-4">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                onValueChange={(val) => {
                                    form.setValue('type', val as 'income' | 'expense');
                                    form.setValue('categoryId', ''); // Reset category on type change
                                }}
                                defaultValue={form.getValues('type')}
                                value={form.watch('type')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="income">Income</SelectItem>
                                    <SelectItem value="expense">Expense</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 flex flex-col">
                            <Label>Date</Label>
                            <Controller
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <DatePicker
                                        date={field.value ? new Date(field.value) : undefined}
                                        setDate={field.onChange}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                            onValueChange={(val) => form.setValue('categoryId', val)}
                            value={form.watch('categoryId')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredCategories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {form.formState.errors.categoryId && (
                            <p className="text-sm text-destructive">{form.formState.errors.categoryId.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input type="number" step="0.01" placeholder="0.00" {...form.register('amount')} />
                        {form.formState.errors.amount && (
                            <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
                        )}
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
                        <Select
                            onValueChange={(val) => form.setValue('paymentMethodId', val)}
                            value={form.watch('paymentMethodId')}
                            disabled={pmLoading || paymentMethods.length === 0}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={pmLoading ? "Loading..." : (paymentMethods.length === 0 ? "No methods set" : "Select payment method")} />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethods.map((method) => (
                                    <SelectItem key={method.id} value={method.id}>
                                        {method.name} {method.isCommon ? '(Common)' : '(Personal)'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Spent By</Label>
                        <Select
                            onValueChange={(val) => form.setValue('spentBy', val)}
                            value={form.watch('spentBy') || profile?.uid}
                            defaultValue={profile?.uid}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Who spent this?" />
                            </SelectTrigger>
                            <SelectContent>
                                {members.map((m) => (
                                    <SelectItem key={m.uid} value={m.uid}>
                                        {m.displayName || m.email || 'Member'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isPersonal"
                            className="h-4 w-4 rounded border-gray-300"
                            {...form.register('isPersonal')}
                        />
                        <Label htmlFor="isPersonal" className="font-normal cursor-pointer">
                            This is a personal expense (not shared)
                        </Label>
                    </div>
                    {selectedPaymentMethodId && paymentMethods.find(m => m.id === selectedPaymentMethodId)?.isCommon && (
                        <p className="text-xs text-muted-foreground ml-6">
                            Common payment method selected. This is likely a shared expense.
                        </p>
                    )}

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input placeholder="What was this for?" {...form.register('description')} />
                        {form.formState.errors.description && (
                            <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    {!transactionToEdit && (
                        <div className="flex items-center space-x-2 rounded-md border p-3">
                            <div className="flex-1">
                                <Label htmlFor="recurring" className="text-sm font-medium">Recurring Transaction?</Label>
                                <p className="text-xs text-muted-foreground">Automatically create this transaction in the future.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="recurring"
                                    className="h-4 w-4 rounded border-gray-300"
                                    {...form.register('isRecurring')}
                                />
                                {form.watch('isRecurring') && (
                                    <Select
                                        onValueChange={(val) => form.setValue('interval', val as 'weekly' | 'monthly' | 'yearly')}
                                        value={form.watch('interval')}
                                    >
                                        <SelectTrigger className="w-[110px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="yearly">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <LoadingSpinner size="sm" className="mr-2" />}
                        {transactionToEdit ? 'Update Transaction' : 'Save Transaction'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
