import { useMemo } from 'react'; // Hook usage needs useState? No, useFirestoreCollection handles it.
import { // Actually 'add', 'update', 'remove' need imports.
    collection,
    query,
    orderBy,
    QueryConstraint
} from 'firebase/firestore';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { tripService } from '@/lib/api/trips';
import { useAuth } from '@/features/auth/AuthContext';

const DEFAULT_CONSTRAINTS: QueryConstraint[] = [];

export function useSubcollection<T extends { id: string }>(
    tripId: string,
    subcollectionName: string,
    constraints: QueryConstraint[] = DEFAULT_CONSTRAINTS
) {
    const { user } = useAuth();

    const q = useMemo(() => {
        if (!tripId || !user) return null;

        return query(
            collection(db, COLLECTIONS.TRIPS, tripId, subcollectionName),
            orderBy('date', 'desc'),
            ...constraints
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId, user, subcollectionName, constraints]);

    // Note: passing individual constraints in deps might be tricky if they are unstable objects.
    // Ideally constraints should be memoized by caller or stable.
    // If constraints change reference every render, this usage of useFirestoreCollection will resubscribe.
    // We assume caller handles stability or we accept re-subscription on constraint change.
    // But wait, ...constraints in dependency array is not valid syntax in standard hooks usually, but here I can't spread.
    // I should probably rely on the query object stability if I memoize it.
    // But I can't spread in dependency array.
    // Let's use a custom key or just [tripId, user, subcollectionName, constraints.length] and hope constraints content is stable if length is same? No, unsafe.
    // Better: just [tripId, user, subcollectionName]. The 'constraints' argument is an array.
    // If I put 'constraints' in deps, it will trigger if reference changes.
    // Warning: Passing an array literal to useSubcollection will break memoization.
    // Caller usage of useSubcollection usually passes static array?

    // Let's look at usage.
    // useTripFunds(id) -> call usage in useTripData.ts
    // Let's check useTripData.ts later. For now, assuming constraints are stable-ish.

    const { data, loading, error } = useFirestoreCollection<T>(q, [q]);

    const add = async (item: Omit<T, 'id'>) => {
        if (!tripId) return;
        await tripService.addSubItem(tripId, subcollectionName, item);
    };

    const update = async (id: string, updates: Partial<T>) => {
        if (!tripId) return;
        await tripService.updateSubItem(tripId, subcollectionName, id, updates);
    };

    const remove = async (id: string) => {
        if (!tripId) return;
        await tripService.deleteSubItem(tripId, subcollectionName, id);
    };

    return { data, loading, error, add, update, remove };
}
