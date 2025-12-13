import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Transaction } from '@/types';

export function useDashboard() {
    const { profile, household } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const currency = household?.currency || 'USD';

    useEffect(() => {
        if (!profile?.householdId) return;

        const q = query(
            collection(db, 'transactions'),
            where('householdId', '==', profile.householdId),
            orderBy('date', 'desc'),
            limit(50)
        );

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
    }, [profile?.householdId]);

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
