import { useState } from 'react';
import { TripFund, UserProfile } from '@/types';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EditTripFundModal } from './EditTripFundModal';

import { useAuth } from '@/features/auth/AuthContext';

interface TripFundsListProps {
    funds: TripFund[];
    participants: UserProfile[];
    onAdd: () => void;
}

export function TripFundsList({ funds, participants, onAdd }: TripFundsListProps) {
    const { household } = useAuth();
    const householdCurrency = household?.currency || 'Base';

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

    const [editingFund, setEditingFund] = useState<TripFund | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: 'baseAmount' | 'contributor'; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: 'baseAmount' | 'contributor') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedFunds = [...funds].sort((a, b) => {
        if (!sortConfig) return 0;

        if (sortConfig.key === 'baseAmount') {
            return sortConfig.direction === 'asc'
                ? a.baseAmount - b.baseAmount
                : b.baseAmount - a.baseAmount;
        }

        if (sortConfig.key === 'contributor') {
            const nameA = getName(a.contributorId).toLowerCase();
            const nameB = getName(b.contributorId).toLowerCase();
            if (nameA < nameB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (nameA > nameB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }

        return 0;
    });

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleSort('contributor')}
                        >
                            <div className="flex items-center gap-1">
                                Contributor
                                {sortConfig?.key === 'contributor' && (
                                    <ArrowUpDown className="h-4 w-4" />
                                )}
                            </div>
                        </TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleSort('baseAmount')}
                        >
                            <div className="flex items-center gap-1">
                                Base Amount
                                {sortConfig?.key === 'baseAmount' && (
                                    <ArrowUpDown className="h-4 w-4" />
                                )}
                            </div>
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedFunds.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-32">
                                <div className="flex flex-col items-center justify-center space-y-2">
                                    <p className="text-muted-foreground">No funds recorded yet. Start by adding money.</p>
                                    <Button variant="outline" size="sm" onClick={onAdd}>Add First Fund</Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        sortedFunds.map((fund) => (
                            <TableRow key={fund.id} className="group">
                                <TableCell>{formatDate(fund.date)}</TableCell>
                                <TableCell>{getName(fund.contributorId)}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1 items-start">
                                        <span className="capitalize">{fund.mode.replace('_', ' ')}</span>
                                        {fund.source === 'exchange' && (
                                            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-blue-200 bg-blue-50 text-blue-700">Exchange</Badge>
                                        )}
                                        {fund.source === 'asset' && (
                                            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-green-200 bg-green-50 text-green-700">Asset</Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div>{fund.amount.toFixed(2)} {fund.currency}</div>
                                    {fund.conversionRate !== 1 && (
                                        <div className="text-xs text-muted-foreground">@ {fund.conversionRate}</div>
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {fund.baseAmount.toFixed(2)}
                                    <span className="text-xs text-muted-foreground ml-1">{householdCurrency}</span>
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingFund(fund)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <EditTripFundModal
                tripId={funds[0]?.tripId || ''} // Fallback might be issue if empty but modal wont open
                fund={editingFund}
                participants={participants}
                open={!!editingFund}
                onOpenChange={(open) => !open && setEditingFund(null)}
            />
        </div>
    );
}
