'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/features/auth/AuthContext';
import { addDoc, collection, serverTimestamp, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Plus, Edit2 } from 'lucide-react';
import { Transaction } from '@/types';

const transactionSchema = z.object({
    type: z.enum(['income', 'expense']),
    amount: z.string().min(1, "Amount is required"),
    currency: z.string(),
    categoryId: z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    date: z.string().min(1, "Date is required"),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const CATEGORIES = [
    { id: 'cat-salary', name: 'Salary', type: 'income' },
    { id: 'cat-rent', name: 'Rent', type: 'expense' },
    { id: 'cat-food', name: 'Food & Groceries', type: 'expense' },
    { id: 'cat-transport', name: 'Transport', type: 'expense' },
    { id: 'cat-utilities', name: 'Utilities', type: 'expense' },
    { id: 'cat-entertainment', name: 'Entertainment', type: 'expense' },
    { id: 'cat-shopping', name: 'Shopping', type: 'expense' },
    { id: 'cat-invest', name: 'Investments', type: 'expense' },
    { id: 'cat-health', name: 'Health', type: 'expense' },
    { id: 'cat-other', name: 'Other', type: 'expense' },
];

interface AddTransactionModalProps {
    transactionToEdit?: Transaction;
    open?: boolean; // Controlled open state
    onOpenChange?: (open: boolean) => void;
}

export function AddTransactionModal({ transactionToEdit, open: controlledOpen, onOpenChange }: AddTransactionModalProps) {
    const { user, profile, household } = useAuth();
    const [internalOpen, setInternalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Use controlled state if provided, otherwise local
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            type: 'expense',
            currency: household?.currency || 'USD',
            date: new Date().toISOString().split('T')[0],
            amount: '',
            description: '',
            categoryId: '',
        },
    });

    // Reset form when editing changes
    useEffect(() => {
        if (transactionToEdit) {
            form.reset({
                type: transactionToEdit.type,
                amount: transactionToEdit.amount.toString(),
                currency: transactionToEdit.currency,
                categoryId: transactionToEdit.categoryId,
                description: transactionToEdit.description,
                date: transactionToEdit.date.toDate().toISOString().split('T')[0]
            });
        } else {
            form.reset({
                type: 'expense',
                currency: household?.currency || 'USD',
                date: new Date().toISOString().split('T')[0],
                amount: '',
                description: '',
                categoryId: '',
            });
        }
    }, [transactionToEdit, form, isOpen, household?.currency]);

    const onSubmit = async (data: TransactionFormValues) => {
        if (!user || !profile?.householdId) return;

        setLoading(true);
        try {
            const payload = {
                type: data.type,
                amount: parseFloat(data.amount),
                currency: data.currency,
                categoryId: data.categoryId,
                categoryName: CATEGORIES.find(c => c.id === data.categoryId)?.name || 'Other',
                description: data.description,
                date: Timestamp.fromDate(new Date(data.date)),
            };

            if (transactionToEdit) {
                await updateDoc(doc(db, 'transactions', transactionToEdit.id), payload);
            } else {
                await addDoc(collection(db, 'transactions'), {
                    ...payload,
                    householdId: profile.householdId,
                    userId: user.uid,
                    attachments: [],
                    isRecurring: false,
                    createdAt: serverTimestamp(),
                });
            }

            setOpen(false);
            if (!transactionToEdit) form.reset();
        } catch (error) {
            console.error("Error saving transaction:", error);
        } finally {
            setLoading(false);
        }
    };

    const selectedType = form.watch('type');
    const filteredCategories = CATEGORIES.filter(c => c.type === selectedType);

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            {!transactionToEdit && (
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Transaction
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{transactionToEdit ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">

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
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" {...form.register('date')} />
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input type="number" step="0.01" placeholder="0.00" {...form.register('amount')} />
                            {form.formState.errors.amount && (
                                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select
                                onValueChange={(val) => form.setValue('currency', val)}
                                defaultValue="USD"
                                value={form.watch('currency')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="USD" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="LKR">LKR</SelectItem>
                                    <SelectItem value="AED">AED</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input placeholder="What was this for?" {...form.register('description')} />
                        {form.formState.errors.description && (
                            <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {transactionToEdit ? 'Update Transaction' : 'Save Transaction'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
