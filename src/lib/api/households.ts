import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { generateHouseholdKey, exportKey } from '@/lib/crypto';
import { Household } from '@/types';
import { User } from 'firebase/auth';

export interface CreateHouseholdData {
    name: string;
    currency: string;
}

export const householdService = {
    /**
     * Checks if a household with the given name exists (case-insensitive preferred).
     * Returns the household document if found, otherwise null.
     */
    async checkAvailability(name: string): Promise<Household | null> {
        const queries = [
            query(collection(db, 'households'), where('name_lower', '==', name.toLowerCase())),
            query(collection(db, 'households'), where('name', '==', name))
        ];

        const results = await Promise.all(queries.map(q => getDocs(q)));

        // Find first non-empty result
        for (const snap of results) {
            if (!snap.empty) {
                const docSnap = snap.docs[0];
                return { id: docSnap.id, ...docSnap.data() } as Household;
            }
        }
        return null;
    },

    /**
     * Creates a new household and updates the user's profile to be an admin of it.
     */
    async createHousehold(data: CreateHouseholdData, user: User): Promise<string> {
        const householdId = uuidv4();
        const key = await generateHouseholdKey();
        const exportedKey = await exportKey(key);

        const newHousehold: Household = {
            id: householdId,
            name: data.name,
            name_lower: data.name.toLowerCase(),
            currency: data.currency,
            memberIds: [user.uid],
            createdAt: serverTimestamp() as any,
            encryptedKeys: {
                [user.uid]: exportedKey
            }
        };

        await setDoc(doc(db, 'households', householdId), newHousehold);

        await updateDoc(doc(db, 'users', user.uid), {
            householdId: householdId,
            role: 'admin'
        });

        return householdId;
    },

    /**
     * Joins an existing household and updates the user's profile.
     */
    async joinHousehold(householdId: string, user: User): Promise<void> {
        // Add user to household.memberIds
        await updateDoc(doc(db, 'households', householdId), {
            memberIds: arrayUnion(user.uid)
        });

        // Update User Profile
        await updateDoc(doc(db, 'users', user.uid), {
            householdId: householdId,
            role: 'user'
        });
    }
};
