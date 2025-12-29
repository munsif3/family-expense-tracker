import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/features/auth/AuthContext';
import { Trip } from '../types';

export function useTrip(tripId: string) {
    const { user } = useAuth();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !tripId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, 'trips', tripId), (doc) => {
            if (doc.exists()) {
                setTrip({ id: doc.id, ...doc.data() } as Trip);
            } else {
                setError("Trip not found");
                setTrip(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching trip:", err);
            setError("Failed to load trip");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, tripId]);

    return { trip, loading, error };
}
