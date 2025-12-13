import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/features/auth/AuthContext';
import { Transaction } from '@/types';
import { transactionService } from '@/lib/api/transactions';
import { CATEGORIES } from '@/lib/constants';

const transactionSchema = z.object({
    type: z.enum(['income', 'expense']),
    amount: z.string().min(1, "Amount is required"),
    categoryId: z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    date: z.string().min(1, "Date is required"),
    isRecurring: z.boolean().optional(),
    interval: z.enum(['weekly', 'monthly', 'yearly']).optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export function useAddTransaction(
    transactionToEdit?: Transaction,
    open?: boolean,
    onOpenChange?: (open: boolean) => void
) {
    const { user, profile, household } = useAuth();
    const [loading, setLoading] = useState(false);

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            type: 'expense',
            date: new Date().toISOString().split('T')[0],
            categoryId: '',
            amount: '',
            description: '',
            isRecurring: false,
            interval: 'monthly',
        },
    });

    useEffect(() => {
        if (transactionToEdit) {
            form.reset({
                type: transactionToEdit.type,
                amount: transactionToEdit.amount.toString(),
                categoryId: transactionToEdit.categoryId,
                description: transactionToEdit.description,
                date: transactionToEdit.date.toDate().toISOString().split('T')[0],
                isRecurring: false, // Editing recurrence not supported in this modal yet
            });
        } else {
            if (open) {
                form.reset({
                    type: 'expense',
                    amount: '',
                    categoryId: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    isRecurring: false,
                    interval: 'monthly',
                });
            }
        }
    }, [transactionToEdit, open, form]);

    const submitTransaction = async (data: TransactionFormValues) => {
        if (!user || !profile?.householdId) return;
        setLoading(true);

        try {
            const payload = {
                type: data.type,
                amount: parseFloat(data.amount),
                currency: household?.currency || 'USD',
                categoryId: data.categoryId,
                categoryName: CATEGORIES.find(c => c.id === data.categoryId)?.name || 'Other',
                description: data.description,
                date: new Date(data.date),
            };

            if (transactionToEdit) {
                await transactionService.updateTransaction(transactionToEdit.id, payload);
            } else {
                await transactionService.addTransaction(payload, profile.householdId, user.uid);

                // Handle Recurring creation
                if (data.isRecurring && data.interval) {
                    await transactionService.addRecurringTransaction(
                        payload,
                        profile.householdId,
                        data.interval
                    );
                }
            }

            onOpenChange?.(false);
            if (!transactionToEdit) form.reset();
        } catch (error) {
            console.error("Error saving transaction:", error);
        } finally {
            setLoading(false);
        }
    };

    return {
        form,
        loading,
        submitTransaction,
    };
}
