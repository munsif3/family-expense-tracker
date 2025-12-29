import { db } from '@/lib/firebase';
import { PaymentMethod } from '@/types';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

export const paymentMethodService = {
    async getPaymentMethods(householdId: string): Promise<PaymentMethod[]> {
        const q = query(collection(db, 'payment_methods'), where('householdId', '==', householdId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod));
    },

    async addPaymentMethod(method: Omit<PaymentMethod, 'id'>) {
        return await addDoc(collection(db, 'payment_methods'), method);
    },

    async deletePaymentMethod(id: string) {
        await deleteDoc(doc(db, 'payment_methods', id));
    }
};
