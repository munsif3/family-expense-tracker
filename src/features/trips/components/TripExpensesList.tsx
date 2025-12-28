import { TripExpense, UserProfile } from '@/types';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface TripExpensesListProps {
    expenses: TripExpense[];
    participants: UserProfile[];
    onAdd: () => void;
}

export function TripExpensesList({ expenses, participants, onAdd }: TripExpensesListProps) {
    const getName = (uid: string) => {
        return participants.find(p => p.uid === uid)?.displayName || uid;
    };

    console.log("[TripExpensesList] Rendering. Expenses:", expenses.length, expenses);

    const formatDate = (date: any) => {
        try {
            if (date?.toDate) return format(date.toDate(), 'MMM d');
            if (date instanceof Date) return format(date, 'MMM d');
            return 'Invalid Date';
        } catch (e) {
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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenses.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-32">
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
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
