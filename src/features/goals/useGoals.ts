import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createSecureQuery } from '@/lib/firestoreUtils';
import { FinancialGoal } from '@/types';
import { toJsDate } from '@/utils/dateUtils';

export function useGoals() {
    const { profile } = useAuth();
    const [goals, setGoals] = useState<FinancialGoal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.householdId) return;

        const q = createSecureQuery({
            collectionName: 'goals',
            householdId: profile.householdId,
            userId: profile.uid,
            constraints: [
                orderBy('deadline', 'asc') // Goals due sooner first
            ]
        });

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    ...d,
                    deadline: d.deadline ? toJsDate(d.deadline) : undefined,
                    createdAt: d.createdAt // Keep raw for now or convert if needed
                };
            }) as FinancialGoal[];
            setGoals(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.householdId, profile?.uid]);

    const addGoal = async (data: Omit<FinancialGoal, 'id' | 'userId' | 'householdId' | 'createdAt'>) => {
        if (!profile?.householdId || !profile?.uid) return;

        await addDoc(collection(db, 'goals'), {
            ...data,
            householdId: profile.householdId,
            userId: profile.uid,
            createdAt: serverTimestamp()
        });
    };

    const updateGoal = async (id: string, data: Partial<FinancialGoal>) => {
        const docRef = doc(db, 'goals', id);
        await updateDoc(docRef, { ...data });
    };

    const deleteGoal = async (id: string) => {
        await deleteDoc(doc(db, 'goals', id));
    };

    return { goals, loading, addGoal, updateGoal, deleteGoal };
}
