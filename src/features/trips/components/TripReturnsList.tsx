
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { TripReturn, UserProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TripReturnsListProps {
    returns: TripReturn[];
    participants: UserProfile[];
    householdCurrency: string;
    onAdd: () => void;
}

export function TripReturnsList({ returns, participants, householdCurrency, onAdd }: TripReturnsListProps) {
    if (returns.length === 0) {
        return (
            <div className="text-center py-8 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground mb-4">No returns recorded yet.</p>
                <Button onClick={onAdd} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Return
                </Button>
            </div>
        );
    }

    const getName = (uid: string) => {
        const p = participants.find(p => p.uid === uid);
        return p ? (p.displayName || p.email) : uid;
    };

    // Sort by date desc
    const sortedReturns = [...returns].sort((a, b) => b.date.toMillis() - a.date.toMillis());

    return (

        <div className="space-y-4">
            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-3">
                {sortedReturns.map((ret) => (
                    <div key={ret.id} className="flex flex-col gap-2 p-4 border rounded-lg bg-card shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-medium">{ret.description}</p>
                                <p className="text-xs text-muted-foreground">{format(ret.date.toDate(), 'MMM d, yyyy')} • {getName(ret.receivedBy)}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">{formatCurrency(ret.amount, ret.currency)}</p>
                                {ret.conversionRate !== 1 && (
                                    <p className="text-xs text-muted-foreground">{householdCurrency}: {formatCurrency(ret.baseAmount, householdCurrency)}</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Received By</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedReturns.map((ret) => (
                            <TableRow key={ret.id}>
                                <TableCell>{format(ret.date.toDate(), 'MMM d, yyyy')}</TableCell>
                                <TableCell>{ret.description}</TableCell>
                                <TableCell>{getName(ret.receivedBy)}</TableCell>
                                <TableCell className="text-right font-medium">
                                    {formatCurrency(ret.amount, ret.currency)}
                                    {ret.conversionRate !== 1 && (
                                        <div className="text-xs text-muted-foreground">
                                            ({householdCurrency}: {formatCurrency(ret.baseAmount, householdCurrency)})
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
