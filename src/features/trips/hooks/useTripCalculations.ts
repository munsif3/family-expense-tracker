import { useMemo } from 'react';
import { TripExpense, TripFund, TripReturn } from '../types';
import { Timestamp, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useTripCalculations(
    funds: TripFund[],
    expenses: TripExpense[],
    returns: TripReturn[]
) {
    const totals = useMemo(() => {
        const totalFunds = funds.reduce((sum, f) => sum + (f.baseAmount || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.baseAmount || 0), 0);
        const totalReturns = returns.reduce((sum, r) => sum + (r.baseAmount || 0), 0);
        const netCost = totalExpenses - totalReturns;
        const remainingFunds = totalFunds - netCost;

        return { totalFunds, totalExpenses, totalReturns, netCost, remainingFunds };
    }, [funds, expenses, returns]);

    const bySource = useMemo(() => {
        const breakdown = {
            exchange: { totalBase: 0, count: 0 },
            asset: { totalBase: 0, count: 0 }
        };
        funds.forEach(f => {
            const source = f.source || 'asset';
            if (breakdown[source]) {
                breakdown[source].totalBase += (f.baseAmount || 0);
                breakdown[source].count += 1;
            }
        });
        return breakdown;
    }, [funds]);

    const byCategory = useMemo(() => {
        const map: Record<string, number> = {};
        expenses.forEach(e => {
            map[e.category] = (map[e.category] || 0) + (e.baseAmount || 0);
        });
        return map;
    }, [expenses]);

    const byUser = useMemo(() => {
        // Contribution vs Spend
        // Spend is tracked by 'paidBy'
        // Contribution is tracked by 'contributorId' in funds
        const map: Record<string, { contributed: number; spent: number; received: number; balance: number }> = {};

        funds.forEach(f => {
            if (!map[f.contributorId]) map[f.contributorId] = { contributed: 0, spent: 0, received: 0, balance: 0 };
            map[f.contributorId].contributed += (f.baseAmount || 0);
        });

        expenses.forEach(e => {
            if (!map[e.paidBy]) map[e.paidBy] = { contributed: 0, spent: 0, received: 0, balance: 0 };
            map[e.paidBy].spent += (e.baseAmount || 0);
        });

        returns.forEach(r => {
            if (!map[r.receivedBy]) map[r.receivedBy] = { contributed: 0, spent: 0, received: 0, balance: 0 };
            map[r.receivedBy].received += (r.baseAmount || 0);
        });

        // Calculate final balance
        Object.keys(map).forEach(uid => {
            const { contributed, spent, received } = map[uid];
            // Balance logic:
            // High positive means "I put in more than I spent/got back" (Owed money?)
            // OR "I have unused credit in the pot".
            // Typically: Balance = In - Out.
            // Contributed (In) - Spent (Out) - Received (Out back to me)
            map[uid].balance = contributed - spent - received;
        });

        return map;
    }, [funds, expenses, returns]);

    return { totals, byCategory, byUser, bySource };
}


// Integration Loop logic
// In a real app this might be a background trigger, but here we export a function 
// that checks and updates the "linked" transaction.
// It aggregates expenses by month-year and updates the corresponding transaction.
export async function syncTripExpensesToMainTracker(
    tripId: string,
    tripName: string,
    expenses: TripExpense[],
    userId: string, // current user doing the sync (presumably the editor)
    householdId?: string
) {
    if (!householdId) return; // Only sync if part of a household/tracker context

    // 1. Group expenses by Month-Year
    const expensesByMonth: Record<string, number> = {};

    expenses.forEach(e => {
        const date = e.date.toDate();
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        expensesByMonth[key] = (expensesByMonth[key] || 0) + (e.baseAmount || 0);
    });

    // 2. For each month, find or create the linked transaction
    for (const [month, amount] of Object.entries(expensesByMonth)) {
        // Check for existing linked transaction
        const q = query(
            collection(db, 'transactions'),
            where('linkedTripId', '==', tripId),
            where('month', '==', month),
            where('type', '==', 'linkedTrip'), // ensuring uniqueness type tag
            where('householdId', '==', householdId) // ensure we only touch this household's view
        );

        const snapshot = await getDocs(q);
        const title = `${tripName} – ${month}`;

        if (!snapshot.empty) {
            // Update existing
            const docRef = snapshot.docs[0].ref;
            // Only update if amount changed significantly? Or always.
            await updateDoc(docRef, {
                amount: amount,
                title: title,
                updatedAt: Timestamp.now()
            });
        } else {
            // Create new
            if (amount > 0) {
                await addDoc(collection(db, 'transactions'), {
                    amount: amount,
                    category: 'Travel', // Fixed category or passed in? Requirement said "Category: Travel"
                    date: Timestamp.fromDate(new Date(`${month}-01`)), // First of month
                    description: `Aggregated expenses for ${tripName}`,
                    householdId: householdId,
                    linkedTripId: tripId,
                    month: month,
                    title: title,
                    type: 'linkedTrip',
                    userId: userId, // The creating user
                    isExpense: true,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            }
        }
    }
}
