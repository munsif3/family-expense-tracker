import { db } from '@/lib/firebase';
import { Transaction } from '@/types';
import { doc, setDoc, updateDoc, increment, getDoc, runTransaction } from 'firebase/firestore';
import { getYear, getMonth } from 'date-fns';

const COLLECTION_NAME = 'monthly_budgets';

export const getMonthlyBudgetDocId = (householdId: string, searchDate: Date) => {
    const year = getYear(searchDate);
    const month = getMonth(searchDate); // 0-11
    return `${householdId}_${year}_${month}`;
};

/**
 * Updates the aggregated spending for a specific transaction action.
 * @param transaction The transaction being added/removed
 * @param action 'add' | 'remove' (For updates, call remove(old) then add(new))
 */
export async function updateBudgetAggregate(
    transaction: Transaction | Omit<Transaction, 'id'>, // Accept full or partial (payload)
    action: 'add' | 'remove',
    householdId: string
) {
    // Only track expenses against budget
    if (transaction.type !== 'expense') return;

    const date = transaction.date instanceof Date ? transaction.date : (transaction.date as any).toDate();
    const docId = getMonthlyBudgetDocId(householdId, date);
    const docRef = doc(db, COLLECTION_NAME, docId);

    // Amount change: Add = +amount, Remove = -amount
    const change = action === 'add' ? transaction.amount : -transaction.amount;

    try {
        // We use setDoc with merge to ensure document exists, 
        // but setDoc with merge doesn't support increment on top of undefined field well in one go if doc is missing?
        // Actually Firestore `setDoc` with `{ merge: true }` and `increment` works fine even if doc creates.
        // However, standard `updateDoc` fails if doc doesn't exist.

        // Strategy: Try update, if fail (not exist), set. 
        // Or just use setDoc with merge: true which allows creating.

        await setDoc(docRef, {
            householdId,
            year: getYear(date),
            month: getMonth(date),
            [`categorySpending.${transaction.categoryId}`]: increment(change),
            lastUpdated: new Date()
        }, { merge: true });

    } catch (error) {
        console.error("Failed to update budget aggregate:", error);
        throw error;
    }
}

/**
 * Recalculates aggregates for a specific year from scratch.
 * Useful for migration or fixing sync issues.
 */
export async function recalculateAggregatesForYear(householdId: string, year: number, allTransactions: Transaction[]) {
    // 1. Reset all months for this year (or just overwrite them)
    // We will build an in-memory map then write in batch.

    const monthlyData: Record<number, Record<string, number>> = {}; // monthIndex -> { catId: total }

    // Init months
    for (let i = 0; i < 12; i++) {
        monthlyData[i] = {};
    }

    // Sum up
    for (const tx of allTransactions) {
        if (tx.type !== 'expense') continue;
        const d = tx.date instanceof Date ? tx.date : (tx.date as any).toDate();
        if (getYear(d) !== year) continue;

        const m = getMonth(d);
        if (!monthlyData[m][tx.categoryId]) monthlyData[m][tx.categoryId] = 0;
        monthlyData[m][tx.categoryId] += tx.amount;
    }

    // Write to Firestore
    const promises = Object.entries(monthlyData).map(async ([monthStr, spending]) => {
        const month = parseInt(monthStr);
        const docId = `${householdId}_${year}_${month}`;
        const ref = doc(db, COLLECTION_NAME, docId);

        // We want to REPLACE the categorySpending map entirely to be safe, 
        // or just set it.
        // Since we are recalculating, we should probably overwrite the categorySpending field.

        await setDoc(ref, {
            householdId,
            year,
            month,
            categorySpending: spending,
            lastUpdated: new Date()
        }, { merge: true });
    });

    await Promise.all(promises);
}
