import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { orderBy, limit, onSnapshot } from 'firebase/firestore';
import { createSecureQuery } from '@/lib/firestoreUtils';
import { Transaction } from '@/types';

export function useDashboard() {
    const { profile, household } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const currency = household?.currency || 'USD';

    useEffect(() => {
        if (!profile?.householdId) return;

        const q = createSecureQuery({
            collectionName: 'transactions',
            householdId: profile.householdId,
            userId: profile.uid,
            constraints: [
                orderBy('date', 'desc'),
                limit(50)
            ]
        });

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Transaction[];
            setTransactions(data);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.householdId, profile?.uid]);

    const summary = useMemo(() => {
        let income = 0;
        let expense = 0;
        transactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        });
        return {
            income,
            expense,
            balance: income - expense,
            savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0
        };
    }, [transactions]);

    return {
        transactions,
        loading,
        currency,
        summary
    };
}
