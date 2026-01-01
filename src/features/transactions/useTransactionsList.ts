import { useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { orderBy, limit } from 'firebase/firestore';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { createSecureQuery } from '@/lib/firestoreUtils';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Transaction } from '@/types';

export function useTransactionsList() {
    const { profile } = useAuth();

    // Filters
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const [viewMode, setViewMode] = useState<'family' | 'personal'>('family');

    // Fetch
    const q = useMemo(() => {
        if (!profile?.householdId) return null;

        // Fetch more for this list view, say 100 recent
        return createSecureQuery({
            collectionName: COLLECTIONS.TRANSACTIONS,
            householdId: profile.householdId,
            // userId: profile.uid, // Omitted to fetch ALL household transactions
            constraints: [
                orderBy('date', 'desc'),
                limit(100)
            ]
        });
    }, [profile?.householdId]);

    const { data: transactions, loading } = useFirestoreCollection<Transaction>(q, [q]);

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
