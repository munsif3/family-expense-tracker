import { useEffect, useState } from 'react';
import { Query, onSnapshot, DocumentData } from 'firebase/firestore';

interface UseFirestoreCollectionReturn<T> {
    data: T[];
    loading: boolean;
    error: string | null;
}

export function useFirestoreCollection<T = DocumentData>(
    query: Query<DocumentData> | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deps: any[] = []
): UseFirestoreCollectionReturn<T> {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!query) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = onSnapshot(
            query,
            (snapshot) => {
                const result = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as T[];
                setData(result);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching collection:', err);
                setError('Failed to load data.');
                setLoading(false);
            }
        );

        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return { data, loading, error };
}
