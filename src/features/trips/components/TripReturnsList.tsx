
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { TripReturn, UserProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TripReturnsListProps {
    returns: TripReturn[];
    participants: UserProfile[];
    onAdd: () => void;
}

export function TripReturnsList({ returns, participants, onAdd }: TripReturnsListProps) {
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
        <div className="border rounded-md">
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
                                {ret.currency} {ret.amount.toFixed(2)}
                                {ret.conversionRate !== 1 && (
                                    <div className="text-xs text-muted-foreground">
                                        (Base: {ret.baseAmount.toFixed(2)})
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
