'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, DollarSign, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { AddAssetModal } from '@/features/savings/AddAssetModal';
import { useSavings, ASSET_ICONS } from '@/features/savings/useSavings';


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

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.totalCurrent, currency)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
                        <TrendingUp className={`h-4 w-4 ${stats.gain >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.gain >= 0 ? '+' : ''}{formatCurrency(stats.gain, currency)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Return on Investment</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.gainPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.gainPercent >= 0 ? '+' : ''}{stats.gainPercent.toFixed(1)}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {Object.entries(grouped).map(([type, typeAssets]) => {
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
        </div>
    );
}
