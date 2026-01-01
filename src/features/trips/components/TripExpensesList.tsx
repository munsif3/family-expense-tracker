import { TripExpense, UserProfile } from '@/types';
import { toJsDate } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { EditTripExpenseModal } from './EditTripExpenseModal';

interface TripExpensesListProps {
    tripId: string;
    tripName: string;
    expenses: TripExpense[];
    participants: UserProfile[];
    onAdd: () => void;
}

export function TripExpensesList({ tripId, tripName, expenses, participants, onAdd }: TripExpensesListProps) {
    const [editingExpense, setEditingExpense] = useState<TripExpense | null>(null);

    const getName = (uid: string) => {
        return participants.find(p => p.uid === uid)?.displayName || uid;
    };

    const formatDate = (date: unknown) => {
        try {
            const jsDate = toJsDate(date);
            return format(jsDate, 'MMM d');
        } catch {
            return 'Error';
        }
    };

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Paid By</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Base Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenses.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-32">
                                <div className="flex flex-col items-center justify-center space-y-2">
                                    <p className="text-muted-foreground">No expenses recorded yet.</p>
                                    <Button variant="outline" size="sm" onClick={onAdd}>
                                        Add First Expense
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        expenses.map((expense) => (
                            <TableRow key={expense.id}>
                                <TableCell>{formatDate(expense.date)}</TableCell>
                                <TableCell className="capitalize">{expense.category}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{expense.notes}</TableCell>
                                <TableCell>{getName(expense.paidBy)}</TableCell>
                                <TableCell>{expense.amount.toFixed(2)} {expense.currency}</TableCell>
                                <TableCell className="font-medium">{expense.baseAmount.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => setEditingExpense(expense)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {editingExpense && (
                <EditTripExpenseModal
                    tripId={tripId}
                    tripName={tripName}
                    participants={participants}
                    open={!!editingExpense}
                    onOpenChange={(open) => !open && setEditingExpense(null)}
                    expense={editingExpense}
                />
            )}
        </div>
    );
}

