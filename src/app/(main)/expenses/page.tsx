'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Transaction } from '@/types';
import { AddTransactionModal } from '@/features/transactions/AddTransactionModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { format } from 'date-fns';
import { formatCurrency, cn } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, Search, Filter, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ExpensesPage() {
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
        const q = query(
            collection(db, 'transactions'),
            where('householdId', '==', profile.householdId),
            orderBy('date', 'desc'),
            limit(100)
        );

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Expenses & Income</h1>
                    <p className="text-muted-foreground">Manage your detailed transaction history.</p>
                </div>
                <AddTransactionModal />
            </div>

            <Card>
                <CardContent className="p-6">
                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search transactions..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-[200px]">
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Mode/Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No transactions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="font-medium">
                                                {format(tx.date.toDate(), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">
                                                        {/* Simple emoji mapping based on text or random? For now, no emoji logic unless passed */}
                                                        🛒
                                                    </span>
                                                    {tx.categoryName}
                                                </div>
                                            </TableCell>
                                            <TableCell>{tx.description}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {tx.type === 'income' ? <ArrowDownLeft className="h-4 w-4 text-green-500" /> : <ArrowUpRight className="h-4 w-4 text-red-500" />}
                                                    <span className="capitalize text-sm text-muted-foreground">{tx.type}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn("text-right font-bold", tx.type === 'income' ? 'text-green-600' : 'text-red-500')}>
                                                {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, tx.currency)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
