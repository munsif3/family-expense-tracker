import { collection, query, where, QueryConstraint, CollectionReference, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SecureQueryOptions {
    collectionName: string;
    householdId: string | undefined;
    userId: string | undefined;
    constraints?: QueryConstraint[];
}

/**
 * Creates a Firestore query that enforces security rules by automatically 
 * applying 'householdId' and 'userId' filters.
 * 
 * @throws Error if householdId or userId is missing.
 */
export function createSecureQuery({ collectionName, householdId, userId, constraints = [] }: SecureQueryOptions) {
    if (!householdId || !userId) {
        throw new Error("Secure query requires both householdId and userId to ensure data isolation.");
    }

    return query(
        collection(db, collectionName),
        where('householdId', '==', householdId),
        where('userId', '==', userId),
        ...constraints
    );
}
