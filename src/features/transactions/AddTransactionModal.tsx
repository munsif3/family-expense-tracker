import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { Transaction } from '@/types';
import { useAddTransaction } from './useAddTransaction';
import { CATEGORIES } from '@/lib/constants';

interface AddTransactionModalProps {
    transactionToEdit?: Transaction;
    open?: boolean; // Controlled open state
    onOpenChange?: (open: boolean) => void;
}

export function AddTransactionModal({ transactionToEdit, open: controlledOpen, onOpenChange }: AddTransactionModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    // Use controlled state if provided, otherwise local
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const { form, loading, submitTransaction } = useAddTransaction(transactionToEdit, isOpen, setOpen);

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
