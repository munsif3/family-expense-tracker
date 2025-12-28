import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    Timestamp,
    orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/features/auth/AuthContext';
import { Trip } from '../types';

export function useTrips() {
    const { user } = useAuth();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setTrips([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'trips'),
            where('participantIds', 'array-contains', user.uid),
            orderBy('startDate', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tripData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Trip[];
            setTrips(tripData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching trips:", err);
            setError("Failed to load trips.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);



    const createTrip = async (data: Omit<Trip, 'id' | 'createdAt' | 'createdBy'>) => {
        if (!user) throw new Error("User not authenticated");

        const tripData = {
            ...data,
            createdBy: user.uid,
            createdAt: Timestamp.now(),
            participantIds: Array.from(new Set([...data.participantIds, user.uid]))
        };

        await addDoc(collection(db, 'trips'), tripData);
    };

    const removeTrip = async (tripId: string) => {
        // TODO: cleanup subcollections? Firestore doesn't auto-delete subcollections.
        // Client-side delete of subcollections is expensive. 
        // Usually we'd use a cloud function or ignore them.
        // Given "No Cloud Functions", we might leave them orphaned or do a batch delete if small.
        // For now, simple delete.
        await deleteDoc(doc(db, 'trips', tripId));
    };

    return { trips, loading, error, createTrip, removeTrip };
}
