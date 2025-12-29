import { TripFund, UserProfile } from '@/types';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface TripFundsListProps {
    funds: TripFund[];
    participants: UserProfile[];
    onAdd: () => void;
}

export function TripFundsList({ funds, participants, onAdd }: TripFundsListProps) {
    const getName = (uid: string) => {
        return participants.find(p => p.uid === uid)?.displayName || uid;
    };

    console.log("[TripFundsList] Rendering. Funds:", funds.length, funds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatDate = (date: any) => {
        try {
            if (date?.toDate) return format(date.toDate(), 'MMM d');
            if (date instanceof Date) return format(date, 'MMM d');
            return 'Invalid Date';
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
                        <TableHead>Contributor</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Base Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {funds.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-32">
                                <div className="flex flex-col items-center justify-center space-y-2">
                                    <p className="text-muted-foreground">No funds recorded yet. Start by adding money.</p>
                                    <Button variant="outline" size="sm" onClick={onAdd}>Add First Fund</Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        funds.map((fund) => (
                            <TableRow key={fund.id}>
                                <TableCell>{formatDate(fund.date)}</TableCell>
                                <TableCell>{getName(fund.contributorId)}</TableCell>
                                <TableCell className="capitalize">{fund.mode.replace('_', ' ')}</TableCell>
                                <TableCell>{fund.amount.toFixed(2)} {fund.currency}</TableCell>
                                <TableCell className="font-medium">{fund.baseAmount.toFixed(2)}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
