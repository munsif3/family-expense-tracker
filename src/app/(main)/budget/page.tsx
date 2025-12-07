'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Transaction, Category } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Save, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// Default categories if none exist (we might need a seed script or just handle on the fly)
// const DEFAULT_CATEGORIES = [
//     { name: 'Housing', color: '#ef4444' },
//     { name: 'Groceries', color: '#f59e0b' },
//     { name: 'Transport', color: '#3b82f6' },
//     { name: 'Dining', color: '#10b981' },
//     { name: 'Utilities', color: '#6366f1' },
//     { name: 'Entertainment', color: '#ec4899' },
//     { name: 'Healthcare', color: '#ef4444' },
//     { name: 'Shopping', color: '#8b5cf6' }
// ];

export default function BudgetPage() {
    const { profile, household } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [localBudgets, setLocalBudgets] = useState<Record<string, number>>({});
    const currency = household?.currency || 'USD';
    const currentYear = new Date().getFullYear();

    // Fetch Transactions (for actual spend)
    useEffect(() => {
        if (!profile?.householdId) return;

        const q = query(
            collection(db, 'transactions'),
            where('householdId', '==', profile.householdId),
            where('type', '==', 'expense')
            // ideally filter by current year/month
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Transaction[];
            setTransactions(data);
        });
        return () => unsubscribe();
    }, [profile?.householdId]);

    // Fetch Categories (to get budget limits)
    useEffect(() => {
        if (!profile?.householdId) return;

        const q = query(
            collection(db, 'categories'),
            where('householdId', '==', profile.householdId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setLoading(false);
            } else {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Category[];
                setCategories(data);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [profile?.householdId]);

    // Calculate Spend per Category
    const budgetStatus = useMemo(() => {
        // Group transactions by name (since we might not have IDs consistently if created ad-hoc)
        const spendMap: Record<string, number> = {};
        transactions.forEach(t => {
            const name = t.categoryName || 'Other';
            spendMap[name] = (spendMap[name] || 0) + t.amount;
        });

        // Merge with defined Categories (which have budgetMonthly)
        const allNames = new Set([...Object.keys(spendMap), ...categories.map(c => c.name)]);

        return Array.from(allNames).map(name => {
            const cat = categories.find(c => c.name === name);
            const spent = spendMap[name] || 0;

            // Calculate Total Budget from User Contributions
            let budgetMonthly = cat?.budgetMonthly || 0;
            if (cat?.userBudgets) {
                const sumUsers = Object.values(cat.userBudgets).reduce((acc, val) => acc + val, 0);
                if (sumUsers > 0) budgetMonthly = sumUsers;
            }

            const budgetAnnual = budgetMonthly * 12;

            const percent = budgetAnnual > 0 ? (spent / budgetAnnual) * 100 : (spent > 0 ? 100 : 0);

            return {
                name,
                id: cat?.id,
                spent,
                budgetAnnual,
                percent,
                color: cat?.color || '#cbd5e1'
            };
        }).sort((a, b) => b.spent - a.spent);
    }, [transactions, categories]);

    const handleSaveBudgets = async () => {
        if (!profile?.uid) return;

        try {
            const updates = categories.map(cat => {
                const newAmount = localBudgets[cat.id];
                if (newAmount === undefined) return null; // No change

                // Update userBudgets.[uid]
                const userBudgets = cat.userBudgets || {};
                const updatedUserBudgets = { ...userBudgets, [profile.uid]: newAmount };

                // Calculate new total for backward compatibility or display
                const newTotal = Object.values(updatedUserBudgets).reduce((a, b) => a + b, 0);

                return updateDoc(doc(db, 'categories', cat.id), {
                    userBudgets: updatedUserBudgets,
                    budgetMonthly: newTotal
                });
            });

            await Promise.all(updates.filter(u => u !== null));
            setEditMode(false);
        } catch (error) {
            console.error("Error saving budgets:", error);
        }
    };

    const openEditModal = () => {
        // Pre-fill with current user's values
        const initial: Record<string, number> = {};
        categories.forEach(c => {
            initial[c.id] = c.userBudgets?.[profile?.uid || ''] || 0;
        });
        setLocalBudgets(initial);
        setEditMode(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Annual Budget ({currentYear})</h1>
                    <p className="text-muted-foreground">Plan and track your limits.</p>
                </div>
                <Button variant="outline" onClick={openEditModal}>
                    <Edit2 className="mr-2 h-4 w-4" /> Edit My Contributions
                </Button>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-8">
                        {budgetStatus.map((item) => (
                            <div key={item.name} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="font-semibold">{item.name}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="font-medium">{formatCurrency(item.spent, currency)}</span>
                                        <span className="text-muted-foreground"> / {formatCurrency(item.budgetAnnual, currency)} yr</span>
                                    </div>
                                </div>
                                <Progress value={Math.min(item.percent, 100)} className="h-3"
                                    indicatorColor={item.percent > 100 ? 'bg-red-500' : item.percent > 85 ? 'bg-yellow-500' : 'bg-green-500'}
                                />
                                {item.percent > 100 && (
                                    <p className="text-xs text-red-500 font-medium mt-1">Over Budget!</p>
                                )}
                            </div>
                        ))}

                        {budgetStatus.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No expense data found to budget against.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Dialog open={editMode} onOpenChange={setEditMode}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Plan Your Contributions</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <p className="text-sm text-muted-foreground">
                            Set your personal monthly contribution for each category. These will be added to other members' contributions to form the total household budget.
                        </p>
                        {categories.map(cat => (
                            <div key={cat.id} className="grid grid-cols-4 items-center gap-4">
                                <Label className="col-span-2">{cat.name}</Label>
                                <div className="col-span-2 relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">{currency}</span>
                                    <Input
                                        type="number"
                                        className="pl-12"
                                        placeholder="0"
                                        value={localBudgets[cat.id] || ''}
                                        onChange={(e) => setLocalBudgets(prev => ({
                                            ...prev,
                                            [cat.id]: parseFloat(e.target.value) || 0
                                        }))}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
                        <Button onClick={handleSaveBudgets}>
                            <Save className="mr-2 h-4 w-4" /> Save Changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
