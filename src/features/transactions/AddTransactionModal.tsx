import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Transaction, UserProfile } from '@/types';
import { useAddTransaction } from './useAddTransaction';
import { CATEGORIES } from '@/lib/constants';

interface AddTransactionModalProps {
    transactionToEdit?: Transaction;
    open?: boolean; // Controlled open state
    onOpenChange?: (open: boolean) => void;
}

export function AddTransactionModal({ transactionToEdit, open, onOpenChange }: AddTransactionModalProps) {
    const { form, loading, submitTransaction } = useAddTransaction(transactionToEdit, !!open, onOpenChange || (() => { }));

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

                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input type="number" step="0.01" placeholder="0.00" {...form.register('amount')} />
                        {form.formState.errors.amount && (
                            <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
                        )}
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
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {transactionToEdit ? 'Update Transaction' : 'Save Transaction'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
