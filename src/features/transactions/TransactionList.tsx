'use client';
import { useAuth } from '@/features/auth/AuthContext';
import { useState } from 'react';
import { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ArrowDownLeft, ArrowUpRight, Tag, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AddTransactionModal } from './AddTransactionModal';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { groupTransactionsByDate } from './transactionUtils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface TransactionListProps {
    transactions: Transaction[];
    loading?: boolean;
    compact?: boolean;
}

export function TransactionList({ transactions, loading, compact }: TransactionListProps) {
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

    if (loading) {
        return <LoadingSpinner size="md" className="py-8" text="Loading transactions..." />;
    }

    if (transactions.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <p>No transactions found.</p>
                    <p className="text-sm">Add your first income or expense!</p>
                </CardContent>
            </Card>
        )
    }

    const { profile } = useAuth(); // Needed for householdId

    const handleDelete = async () => {
        if (!deletingTx || !profile?.householdId) return;
        try {
            await deleteDoc(doc(db, 'transactions', deletingTx.id));

            // Update Budget Aggregates
            const { updateBudgetAggregate } = await import('@/features/budget/budgetAggregations');
            await updateBudgetAggregate(deletingTx, 'remove', profile.householdId);

            setDeletingTx(null);
        } catch (error) {
            console.error("Error deleting transaction", error);
        }
    };

    return (
        <>
            <Card className="col-span-full">
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={cn(
                        "space-y-6",
                        compact && "max-h-[260px] overflow-y-auto pr-2"
                    )}>



                        {Object.entries(groupTransactionsByDate(transactions)).map(([date, txs]) => (
                            <div key={date} className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-card py-2 z-10">{date}</h3>
                                {txs.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors group gap-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={cn(
                                                    "flex h-10 w-10 items-center justify-center rounded-full",
                                                    tx.type === 'income' ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                                )}
                                            >
                                                {tx.type === 'income' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="font-medium leading-none">{tx.description}</p>
                                                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                                    <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {tx.categoryName}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                                            <div className={cn(
                                                "font-bold",
                                                tx.type === 'income' ? "text-green-600" : "text-red-600"
                                            )}>
                                                {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, tx.currency)}
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setEditingTx(tx)}>
                                                        <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setDeletingTx(tx)} className="text-red-600">
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal */}
            {editingTx && (
                <AddTransactionModal
                    transactionToEdit={editingTx}
                    open={!!editingTx}
                    onOpenChange={(open) => !open && setEditingTx(null)}
                />
            )}

            {/* Delete Confirmation */}
            <Dialog open={!!deletingTx} onOpenChange={(open) => !open && setDeletingTx(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Transaction?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-bold">{deletingTx?.description}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingTx(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
