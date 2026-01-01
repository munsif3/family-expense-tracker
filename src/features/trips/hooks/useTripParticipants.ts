import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';

export function useTripParticipants(participantIds: string[]) {
    const [participants, setParticipants] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchParticipants() {
            if (!participantIds || participantIds.length === 0) {
                setParticipants([]);
                setLoading(false);
                return;
            }

            try {
                // Firestore 'in' query supports up to 10
                // 'array-contains' is one value.
                // To fetch by IDs, we use where(documentId(), 'in', ids)
                // If > 10, need to batch. For now assume < 10.

                const chunks = [];
                for (let i = 0; i < participantIds.length; i += 10) {
                    chunks.push(participantIds.slice(i, i + 10));
                }

                let allUsers: UserProfile[] = [];

                for (const chunk of chunks) {
                    const q = query(
                        collection(db, 'users'),
                        where(documentId(), 'in', chunk)
                    );
                    const snap = await getDocs(q);
                    const chunkUsers = snap.docs.map(d => d.data() as UserProfile);
                    allUsers = [...allUsers, ...chunkUsers];
                }

                setParticipants(allUsers);
            } catch (err) {
                console.error("Error fetching participants", err);
            } finally {
                setLoading(false);
            }
        }

        fetchParticipants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(participantIds)]);

    return { participants, loading };
}
