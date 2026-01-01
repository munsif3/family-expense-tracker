import { useState, useMemo } from 'react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import {
    collection,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { tripService } from '@/lib/api/trips';
import { useAuth } from '@/features/auth/AuthContext';
import { Trip } from '../types';

export function useTrips() {
    const { user } = useAuth();
    const q = useMemo(() => {
        if (!user) return null;
        return query(
            collection(db, COLLECTIONS.TRIPS),
            where('participantIds', 'array-contains', user.uid),
            orderBy('startDate', 'desc')
        );
    }, [user]);

    const { data: trips, loading, error } = useFirestoreCollection<Trip>(q, [q]);



    const createTrip = async (data: Omit<Trip, 'id' | 'createdAt' | 'createdBy'>) => {
        if (!user) throw new Error("User not authenticated");
        await tripService.createTrip(data, user.uid);
    };

    const removeTrip = async (tripId: string) => {
        // TODO: cleanup subcollections? Firestore doesn't auto-delete subcollections.
        // Client-side delete of subcollections is expensive. 
        await tripService.deleteTrip(tripId);
    };

    return { trips, loading, error, createTrip, removeTrip };
}
