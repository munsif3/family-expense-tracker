import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { orderBy, onSnapshot, limit } from 'firebase/firestore';
import { createSecureQuery } from '@/lib/firestoreUtils';
import { Transaction } from '@/types';

export function useTransactionsList() {
    const { profile } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const [viewMode, setViewMode] = useState<'family' | 'personal'>('family');

    // Fetch
    useEffect(() => {
        if (!profile?.householdId) return;

        // Fetch more for this list view, say 100 recent
        const q = createSecureQuery({
            collectionName: 'transactions',
            householdId: profile.householdId,
            // userId: profile.uid, // Omitted to fetch ALL household transactions
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

    // Client-side filtering via useMemo
    const filtered = useMemo(() => {
        let result = transactions;

        // View Mode Filter
        if (viewMode === 'family') {
            result = result.filter(t => !t.isPersonal);
        } else {
            // Personal: Only show my personal expenses
            result = result.filter(t => t.isPersonal && t.spentBy === profile?.uid);
        }

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

        return result;
    }, [search, categoryFilter, transactions, viewMode, profile?.uid]);

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
        categories,
        viewMode,
        setViewMode
    };
}
