import { useState, useEffect } from 'react';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    orderBy,
    QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/features/auth/AuthContext';

export function useSubcollection<T extends { id: string }>(
    tripId: string,
    subcollectionName: string,
    constraints: QueryConstraint[] = []
) {
    const { user } = useAuth();
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tripId || !user) {
            setData([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'trips', tripId, subcollectionName),
            orderBy('date', 'desc'),
            ...constraints
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log(`[useSubcollection:${subcollectionName}] Snapshot received. Docs:`, snapshot.docs.length);
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as T[];
            console.log(`[useSubcollection:${subcollectionName}] Parsed items:`, items);
            setData(items);
            setLoading(false);
        }, (err) => {
            console.error(`Error fetching ${subcollectionName}:`, err);
            setError(`Failed to load ${subcollectionName}`);
            setLoading(false);
        });

        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId, user, subcollectionName]);

    const add = async (item: Omit<T, 'id'>) => {
        if (!tripId) return;
        await addDoc(collection(db, 'trips', tripId, subcollectionName), item);
    };

    const update = async (id: string, updates: Partial<T>) => {
        if (!tripId) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await updateDoc(doc(db, 'trips', tripId, subcollectionName, id), updates as any);
    };

    const remove = async (id: string) => {
        if (!tripId) return;
        await deleteDoc(doc(db, 'trips', tripId, subcollectionName, id));
    };

    return { data, loading, error, add, update, remove };
}
