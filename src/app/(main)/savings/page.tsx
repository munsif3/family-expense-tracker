'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, DollarSign, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { AddAssetModal } from '@/features/savings/AddAssetModal';
import { useSavings, ASSET_ICONS } from '@/features/savings/useSavings';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/AuthContext';
import { useMemo } from 'react';
import { Asset } from '@/types';


export default function SavingsPage() {
    const {
        assets,
        stats,
        grouped,
        loading,
        currency,
        assetToEdit,
        setAssetToEdit,
        openAdd,
        setOpenAdd,
        membersMap
    } = useSavings();

    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'family' | 'personal'>('family');

    const filteredAssets = useMemo(() => {
        if (viewMode === 'family') return assets;
        return assets.filter(a => {
            // Check direct ownership or meta ownerIds
            if (a.ownerIds && a.ownerIds.length > 0) return a.ownerIds.includes(user?.uid || '');
            return a.ownerUserId === user?.uid;
        });
    }, [assets, viewMode, user]);

    const displayedStats = useMemo(() => {
        let totalInvested = 0;
        let totalCurrent = 0;

        filteredAssets.forEach(a => {
            totalInvested += a.amountInvested;
            totalCurrent += (a.currentValue || a.amountInvested);
        });

        const gain = totalCurrent - totalInvested;
        const gainPercent = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

        return { totalInvested, totalCurrent, gain, gainPercent };
    }, [filteredAssets]);

    const displayedGrouped = useMemo(() => {
        const groups: Record<string, Asset[]> = {};
        filteredAssets.forEach(a => {
            if (!groups[a.type]) groups[a.type] = [];
            groups[a.type].push(a);
        });
        return groups;
    }, [filteredAssets]);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading savings...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 md:pb-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Savings & Investments</h1>
                    <p className="text-muted-foreground mt-1">Track your assets and portfolio growth</p>
                </div>
                <Button onClick={() => setOpenAdd(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Asset
                </Button>
            </div>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'family' | 'personal')} className="w-full">
                <TabsList>
                    <TabsTrigger value="family">Family Portfolio</TabsTrigger>
                    <TabsTrigger value="personal">My Portfolio</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(displayedStats.totalCurrent, currency)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
                        <TrendingUp className={`h-4 w-4 ${stats.gain >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${displayedStats.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {displayedStats.gain >= 0 ? '+' : ''}{formatCurrency(displayedStats.gain, currency)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Return on Investment</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${displayedStats.gainPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {displayedStats.gainPercent >= 0 ? '+' : ''}{displayedStats.gainPercent.toFixed(1)}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {Object.entries(displayedGrouped).map(([type, typeAssets]) => {
                    const TypeIcon = ASSET_ICONS[type] || DollarSign;
                    const typeTotal = typeAssets.reduce((sum, a) => sum + (a.currentValue || a.amountInvested), 0);

                    return (
                        <Card key={type}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <TypeIcon className="h-5 w-5 text-primary" />
                                        </div>
                                        <CardTitle className="text-lg">{type}</CardTitle>
                                    </div>
                                    <div className="font-bold text-lg">
                                        {formatCurrency(typeTotal, currency)}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {typeAssets.map(asset => (
                                    <div
                                        key={asset.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                                        onClick={() => setAssetToEdit(asset)}
                                    >
                                        <div>
                                            <p className="font-medium">{asset.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                <span>{format(asset.buyDate.toDate(), 'MMM d, yyyy')}</span>
                                                {(() => {
                                                    const ids = (asset.ownerIds && asset.ownerIds.length > 0)
                                                        ? asset.ownerIds
                                                        : (asset.ownerUserId ? [asset.ownerUserId] : []);

                                                    if (ids.length === 0) return null;

                                                    return (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1">
                                                                <Users className="h-3 w-3" />
                                                                {ids.map(id => membersMap[id] || 'Unknown').join(', ')}
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            {asset.source && (
                                                <div className="text-xs text-muted-foreground mt-0.5 italic pl-0">
                                                    Source: {asset.source}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">{formatCurrency(asset.currentValue || asset.amountInvested, currency)}</p>

                                            {/* Invested Amount */}
                                            <p className="text-xs text-muted-foreground">
                                                Inv: {formatCurrency(asset.amountInvested, currency)}
                                            </p>

                                            <p className={`text-xs ${(asset.currentValue || asset.amountInvested) >= asset.amountInvested ? 'text-green-600' : 'text-red-600'}`}>
                                                {((asset.currentValue || asset.amountInvested) - asset.amountInvested) >= 0 ? '+' : ''}
                                                {formatCurrency((asset.currentValue || asset.amountInvested) - asset.amountInvested, currency)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <AddAssetModal
                open={openAdd || !!assetToEdit}
                onOpenChange={(open) => {
                    if (!open) {
                        setOpenAdd(false);
                        setAssetToEdit(null);
                    } else {
                        setOpenAdd(true);
                    }
                }}
                assetToEdit={assetToEdit || undefined}
            />
        </div >
    );
}
