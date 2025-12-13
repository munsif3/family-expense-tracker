import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createSecureQuery } from '@/lib/firestoreUtils';
import { Transaction } from '@/types';

export function useTransactionsList() {
    const { profile } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filtered, setFiltered] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Fetch
    useEffect(() => {
        if (!profile?.householdId) return;

        // Fetch more for this list view, say 100 recent
        const q = createSecureQuery({
            collectionName: 'transactions',
            householdId: profile.householdId,
            userId: profile.uid,
            constraints: [
                orderBy('date', 'desc'),
                limit(100)
            ]
        });

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Transaction[];
            setTransactions(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.householdId]);

    // Client-side filtering
    useEffect(() => {
        let result = transactions;

        if (search) {
            const lower = search.toLowerCase();
            result = result.filter(t =>
                t.description.toLowerCase().includes(lower) ||
                t.categoryName?.toLowerCase().includes(lower)
            );
        }

        if (categoryFilter !== 'all') {
            result = result.filter(t => t.categoryName === categoryFilter);
        }

        setFiltered(result);
    }, [search, categoryFilter, transactions]);

    // Derive unique categories for filter
    const categories = Array.from(new Set(transactions.map(t => t.categoryName || 'Other'))).sort();

    return {
        transactions,
        filtered,
        loading,
        search,
        setSearch,
        categoryFilter,
        setCategoryFilter,
        categories
    };
}
