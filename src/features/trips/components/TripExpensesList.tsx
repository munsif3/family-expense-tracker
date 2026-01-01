import { TripExpense, UserProfile, ExpenseCategory } from '@/types';
import { toJsDate } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import { EditTripExpenseModal } from './EditTripExpenseModal';
import { CATEGORY_CONFIG } from '../constants';

interface TripExpensesListProps {
    tripId: string;
    tripName: string;
    expenses: TripExpense[];
    participants: UserProfile[];
    onAdd: () => void;
}

export function TripExpensesList({ tripId, tripName, expenses, participants, onAdd }: TripExpensesListProps) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
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

    const sortedExpenses = [...expenses].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;

        let aValue: string | number = '';
        let bValue: string | number = '';

        if (key === 'paidBy') {
            aValue = getName(a.paidBy);
            bValue = getName(b.paidBy);
        } else if (key === 'date') {
            aValue = toJsDate(a.date).getTime();
            bValue = toJsDate(b.date).getTime();
        } else if (key === 'category') {
            aValue = a.category;
            bValue = b.category;
        } else if (key === 'baseAmount') {
            aValue = a.baseAmount;
            bValue = b.baseAmount;
        } else {
            // Fallback for other potential keys if any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            aValue = (a as any)[key] || '';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            bValue = (b as any)[key] || '';
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSort('date')}>
                            <div className="flex items-center">Date <SortIcon columnKey="date" sortConfig={sortConfig} /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSort('category')}>
                            <div className="flex items-center">Category <SortIcon columnKey="category" sortConfig={sortConfig} /></div>
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSort('paidBy')}>
                            <div className="flex items-center">Paid By <SortIcon columnKey="paidBy" sortConfig={sortConfig} /></div>
                        </TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => requestSort('baseAmount')}>
                            <div className="flex items-center">Base Amount <SortIcon columnKey="baseAmount" sortConfig={sortConfig} /></div>
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedExpenses.length === 0 ? (
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
                        sortedExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                                <TableCell>{formatDate(expense.date)}</TableCell>
                                <TableCell className="capitalize">
                                    {(() => {
                                        const config = CATEGORY_CONFIG[expense.category as ExpenseCategory];
                                        if (config) {
                                            const Icon = config.icon;
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`h-4 w-4 ${config.color}`} />
                                                    <span>{config.label}</span>
                                                </div>
                                            );
                                        }
                                        return expense.category;
                                    })()}
                                </TableCell>
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

function SortIcon({ columnKey, sortConfig }: { columnKey: string; sortConfig: { key: string; direction: 'asc' | 'desc' } | null }) {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
    return sortConfig.direction === 'asc'
        ? <ArrowUp className="ml-2 h-4 w-4" />
        : <ArrowDown className="ml-2 h-4 w-4" />;
}

