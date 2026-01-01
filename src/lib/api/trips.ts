import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Trip } from '@/types';
import { addDoc, collection, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';

export const tripService = {
    async createTrip(data: Omit<Trip, 'id' | 'createdAt' | 'createdBy'>, userId: string) {
        const tripData = {
            ...data,
            createdBy: userId,
            createdAt: Timestamp.now(),
            participantIds: Array.from(new Set([...data.participantIds, userId]))
        };
        return await addDoc(collection(db, COLLECTIONS.TRIPS), tripData);
    },

    async deleteTrip(tripId: string) {
        await deleteDoc(doc(db, COLLECTIONS.TRIPS, tripId));
    },

    // Subcollection Helpers (Generic for brevity, could be explicit)
    async addSubItem<T>(tripId: string, subcollection: string, item: T) {
        return await addDoc(collection(db, COLLECTIONS.TRIPS, tripId, subcollection), item as any);
    },

    async updateSubItem<T>(tripId: string, subcollection: string, id: string, updates: Partial<T>) {
        await updateDoc(doc(db, COLLECTIONS.TRIPS, tripId, subcollection, id), updates as any);
    },

    async deleteSubItem(tripId: string, subcollection: string, id: string) {
        await deleteDoc(doc(db, COLLECTIONS.TRIPS, tripId, subcollection, id));
    }
};
