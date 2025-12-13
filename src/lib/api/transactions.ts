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
}

export const transactionService = {
    async addTransaction(data: TransactionData, householdId: string, userId: string) {
        await addDoc(collection(db, 'transactions'), {
            ...data,
            date: Timestamp.fromDate(data.date),
            householdId,
            userId,
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
    }
};
