import { collection, query, where, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SecureQueryOptions {
    collectionName: string;
    householdId: string | undefined;
    userId?: string; // Optional: Provide only if you want to restrict to a specific user
    constraints?: QueryConstraint[];
}

/**
 * Creates a Firestore query that guarantees household isolation.
 * Optionally filters by userId if provided.
 */
export function createSecureQuery({ collectionName, householdId, userId, constraints = [] }: SecureQueryOptions) {
    if (!householdId) {
        throw new Error("Secure query requires householdId to ensure data isolation.");
    }

    const baseConstraints = [where('householdId', '==', householdId)];

    // Only add userId filter if strictly requested
    if (userId) {
        baseConstraints.push(where('userId', '==', userId));
    }

    return query(
        collection(db, collectionName),
        ...baseConstraints,
        ...constraints
    );
}
