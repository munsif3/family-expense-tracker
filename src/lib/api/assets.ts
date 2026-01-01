import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { addDoc, collection, serverTimestamp, Timestamp, updateDoc, doc } from 'firebase/firestore';

export interface AssetData {
    name: string;
    type: string;
    amountInvested: number;
    currentValue: number;
    buyDate: Date;
    source?: string;
    ownerIds?: string[];
}

export const assetService = {
    async addAsset(data: AssetData, householdId: string, userId: string, currency: string) {
        await addDoc(collection(db, COLLECTIONS.ASSETS), {
            ...data,
            buyDate: Timestamp.fromDate(data.buyDate),
            householdId,
            ownerUserId: userId, // Default owner (creator) or primary owner
            currency,
            isEncrypted: false,
            attachments: [],
            meta: {},
            createdAt: serverTimestamp(),
        });
    },

    async updateAsset(id: string, data: AssetData) {
        await updateDoc(doc(db, COLLECTIONS.ASSETS, id), {
            ...data,
            buyDate: Timestamp.fromDate(data.buyDate),
        });
    }
};
