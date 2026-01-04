"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Transaction } from '@/types';
import { recalculateAggregatesForYear } from '../budgetAggregations';
import { toast } from 'sonner';

interface RecalculateBudgetsButtonProps {
    year: number;
}

export function RecalculateBudgetsButton({ year }: RecalculateBudgetsButtonProps) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleRecalculate = async () => {
        if (!profile?.householdId) return;

        try {
            setLoading(true);
            toast.info(`Recalculating budgets for ${year}...`);

            // 1. Fetch ALL transactions for the year (optimizable by date range)
            const start = new Date(year, 0, 1);
            const end = new Date(year, 11, 31, 23, 59, 59);

            const q = query(
                collection(db, COLLECTIONS.TRANSACTIONS),
                where('householdId', '==', profile.householdId),
                where('date', '>=', Timestamp.fromDate(start)),
                where('date', '<=', Timestamp.fromDate(end))
            );

            const snapshot = await getDocs(q);
            const transactions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));

            console.log(`Found ${transactions.length} transactions for ${year}`);

            // 2. Run aggregation
            await recalculateAggregatesForYear(profile.householdId, year, transactions);

            toast.success(`Budgets Recalculated for ${year}`);
        } catch (error) {
            console.error("Aggregation failed", error);
            toast.error("Failed to recalculate budgets");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleRecalculate}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground"
        >
            <RefreshCw className={`mr-2 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing...' : 'Sync Data'}
        </Button>
    );
}
