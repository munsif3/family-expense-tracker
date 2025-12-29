'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RecurringTransaction } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, CalendarClock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CATEGORIES } from '@/lib/constants';

export default function SubscriptionsPage() {
    const { profile, household } = useAuth();
    const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    const currency = household?.currency || 'USD';

    useEffect(() => {
        if (!profile?.householdId) return;

        const fetchRecurring = async () => {
            try {
                const q = query(
                    collection(db, 'recurring_transactions'),
                    where('householdId', '==', profile.householdId),
                    where('active', '==', true)
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as RecurringTransaction[];
                setRecurring(data);
            } catch (error) {
                console.error("Error fetching subscriptions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecurring();
    }, [profile?.householdId]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to stop this recurring transaction?")) return;
        try {
            await deleteDoc(doc(db, 'recurring_transactions', id));
            setRecurring(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error("Error deleting subscription:", error);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Subscriptions & Recurring</h1>
                    <p className="text-muted-foreground mt-1">Manage your automated recurring expenses.</p>
                </div>
            </div>

            {recurring.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <CalendarClock className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">No recurring transactions found</p>
                        <p className="text-sm">Add a transaction and check &quot;Recurring&quot; to see it here.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recurring.map(item => {
                        const catName = CATEGORIES.find(c => c.id === item.categoryId)?.name || 'Other';
                        return (
                            <Card key={item.id}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="font-semibold text-lg">{item.description}</div>
                                    <div className={`text-sm font-bold uppercase px-2 py-1 rounded bg-muted`}>
                                        {item.interval}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold mb-1">
                                        {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount, currency)}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">{catName}</p>

                                    <div className="flex items-center justify-between mt-4 border-t pt-4">
                                        <div className="text-xs text-muted-foreground">
                                            Next: {item.nextRunDate?.toDate().toLocaleDateString()}
                                        </div>
                                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
