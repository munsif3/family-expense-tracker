import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { Transaction } from '@/types';

export interface TransactionData {
    type: 'income' | 'expense';
    amount: number;
    currency: string;
    categoryId: string;
    categoryName: string;
    description: string;
    date: Date;
    spentBy?: string;
    isPersonal?: boolean;
}

export const transactionService = {
    async addTransaction(data: TransactionData, householdId: string, userId: string) {
        await addDoc(collection(db, 'transactions'), {
            ...data,
            date: Timestamp.fromDate(data.date),
            householdId,
            userId,
            spentBy: data.spentBy || userId, // Default to creator if not specified
            isPersonal: data.isPersonal || false,
            attachments: [],
            isRecurring: false,
            createdAt: serverTimestamp(),
        });
    },

    async updateTransaction(id: string, data: TransactionData) {
        await updateDoc(doc(db, 'transactions', id), {
            ...data,
            date: Timestamp.fromDate(data.date),
        });
    },

    async addRecurringTransaction(data: TransactionData, householdId: string, interval: 'weekly' | 'monthly' | 'yearly') {
        const nextRun = new Date(data.date);
        if (interval === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
        if (interval === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);
        if (interval === 'yearly') nextRun.setFullYear(nextRun.getFullYear() + 1);

        await addDoc(collection(db, 'recurring_transactions'), {
            householdId,
            description: data.description,
            amount: data.amount,
            type: data.type,
            categoryId: data.categoryId,
            interval,
            nextRunDate: Timestamp.fromDate(nextRun),
            active: true,
            createdAt: serverTimestamp()
        });
    }
};
