import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { PaymentMethod } from '@/types';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

export const paymentMethodService = {
    async getPaymentMethods(householdId: string): Promise<PaymentMethod[]> {
        const q = query(collection(db, COLLECTIONS.PAYMENT_METHODS), where('householdId', '==', householdId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod));
    },

    async addPaymentMethod(method: Omit<PaymentMethod, 'id'>) {
        return await addDoc(collection(db, COLLECTIONS.PAYMENT_METHODS), method);
    },

    async deletePaymentMethod(id: string) {
        await deleteDoc(doc(db, COLLECTIONS.PAYMENT_METHODS, id));
    }
};
