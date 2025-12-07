'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Asset } from '@/types';
import { AddAssetModal } from '@/features/savings/AddAssetModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { TrendingUp, Wallet, Landmark, Gem, Building2, Bitcoin, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ASSET_ICONS: Record<string, any> = {
    'FD': Landmark,
    'Gold': Gem,
    'Jewellery': Gem,
    'Stock': TrendingUp,
    'Property': Building2,
    'Crypto': Bitcoin,
    'MonthlySaving': Wallet
};

export default function SavingsPage() {
    const { profile, household } = useAuth();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const currency = household?.currency || 'USD';
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);

    useEffect(() => {
        if (!profile?.householdId) return;

        const q = query(
            collection(db, 'assets'),
            where('householdId', '==', profile.householdId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Asset[];
            setAssets(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.householdId]);

    const stats = useMemo(() => {
        let totalInvested = 0;
        let totalCurrent = 0;
        assets.forEach(a => {
            totalInvested += a.amountInvested;
            totalCurrent += (a.currentValue || a.amountInvested);
        });
        const gain = totalCurrent - totalInvested;
        const gainPercent = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
        return { totalCurrent, gain, gainPercent };
    }, [assets]);

    // Group assets by Type
    const grouped = useMemo(() => {
        const groups: Record<string, Asset[]> = {};
        assets.forEach(a => {
            if (!groups[a.type]) groups[a.type] = [];
            groups[a.type].push(a);
        });
        return groups;
    }, [assets]);

    const handleDelete = async () => {
        if (!deletingAsset) return;
        try {
            await deleteDoc(doc(db, 'assets', deletingAsset.id));
            setDeletingAsset(null);
        } catch (error) {
            console.error("Error deleting asset:", error);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Savings & Investments</h1>
                    <p className="text-muted-foreground">Track your comprehensive net worth.</p>
                </div>
                <AddAssetModal />
            </div>

            {/* Portfolio Summary Card */}
            <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <CardContent className="p-8">
                    <p className="text-slate-300 font-medium mb-1">Current Portfolio Value</p>
                    <div className="flex items-baseline gap-4">
                        <h2 className="text-4xl font-bold">{formatCurrency(stats.totalCurrent, currency)}</h2>
                        <div className={cn("flex items-center text-sm font-semibold px-2 py-1 rounded bg-white/10", stats.gain >= 0 ? "text-green-400" : "text-red-400")}>
                            <TrendingUp className="h-4 w-4 mr-1" />
                            {stats.gain >= 0 ? '+' : ''}{stats.gainPercent.toFixed(1)}% all time
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Asset Groups */}
            <div className="space-y-4">
                {Object.entries(grouped).map(([type, items]) => {
                    const TypeIcon = ASSET_ICONS[type] || Wallet;
                    const groupTotal = items.reduce((sum, item) => sum + (item.currentValue || item.amountInvested), 0);

                    return (
                        <div key={type} className="border rounded-xl bg-card overflow-hidden">
                            <div className="bg-muted/30 px-6 py-4 flex items-center justify-between border-b">
                                <div className="flex items-center gap-2">
                                    <TypeIcon className="h-5 w-5 text-primary" />
                                    <span className="font-semibold text-lg">{type === 'FD' ? 'Fixed Deposits' : type}</span>
                                    <span className="text-muted-foreground text-sm">({items.length} items)</span>
                                </div>
                                <span className="font-bold">{formatCurrency(groupTotal, currency)}</span>
                            </div>
                            <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {items.map(asset => (
                                    <Card key={asset.id} className="shadow-none border hover:border-primary/50 transition-colors group relative">

                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setEditingAsset(asset)}>
                                                        <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setDeletingAsset(asset)} className="text-red-600">
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <CardContent className="p-4 space-y-2">
                                            <div className="font-bold text-lg truncate pr-8">{asset.name}</div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Invested:</span>
                                                <span>{formatCurrency(asset.amountInvested, asset.currency)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Current:</span>
                                                <span className="font-bold">{formatCurrency(asset.currentValue || 0, asset.currency)}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-2">
                                                Bought: {format(asset.buyDate.toDate(), 'MMM d, yyyy')}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {assets.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                        No assets added yet. Start building your portfolio!
                    </div>
                )}
            </div>

            {/* Edit Asset Modal */}
            {editingAsset && (
                <AddAssetModal
                    assetToEdit={editingAsset}
                    open={!!editingAsset}
                    onOpenChange={(open) => !open && setEditingAsset(null)}
                />
            )}

            {/* Delete Asset Dialog */}
            <Dialog open={!!deletingAsset} onOpenChange={(open) => !open && setDeletingAsset(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Asset?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-bold">{deletingAsset?.name}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingAsset(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
