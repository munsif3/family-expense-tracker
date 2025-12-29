import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FinancialProfile } from '@/types';

const COLLECTION_PATH = 'households';
const SUBCOLLECTION = 'settings';
const DOC_ID = 'financialProfile';

export const useFinancialProfile = (householdId?: string) => {
    const [profile, setProfile] = useState<FinancialProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!householdId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }

        const ref = doc(db, COLLECTION_PATH, householdId, SUBCOLLECTION, DOC_ID);

        const unsubscribe = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                setProfile(snap.data() as FinancialProfile);
            } else {
                setProfile(null);
            }
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError('Failed to load financial profile');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [householdId]);

    const updateProfile = async (data: Partial<FinancialProfile>) => {
        if (!householdId) return;
        const ref = doc(db, COLLECTION_PATH, householdId, SUBCOLLECTION, DOC_ID);

        try {
            // Check if exists
            if (!profile) {
                const newProfile: FinancialProfile = {
                    householdId,
                    currency: data.currency || 'USD',
                    riskAllocation: data.riskAllocation || { conservative: 50, moderate: 30, aggressive: 20 },
                    savingsCapacity: data.savingsCapacity || [],
                    totalMonthlyIncome: data.totalMonthlyIncome || 0,
                    monthlyCommitments: data.monthlyCommitments || 0,
                    variableCommitments: data.variableCommitments || 0,
                    income: data.income || [],
                    lastUpdated: Timestamp.now(),
                    ...data
                } as FinancialProfile;
                await setDoc(ref, newProfile);
            } else {
                await updateDoc(ref, {
                    ...data,
                    lastUpdated: Timestamp.now()
                });
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            throw err;
        }
    };

    return { profile, loading, error, updateProfile };
};
