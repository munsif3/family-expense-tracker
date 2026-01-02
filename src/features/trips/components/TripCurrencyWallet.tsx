'use client';

import { useMemo } from 'react';
import { Trip, TripFund, TripExpense } from '@/features/trips/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Coins,
    ArrowRightLeft,
    Wallet,
    Globe,
    TrendingDown
} from 'lucide-react';

interface TripCurrencyWalletProps {
    trip: Trip;
    funds: TripFund[];
    expenses: TripExpense[];
    householdCurrency: string;
}

export function TripCurrencyWallet({ trip, funds, expenses, householdCurrency }: TripCurrencyWalletProps) {

    // Group funds and expenses by currency
    const balances = useMemo(() => {
        const currencyMap = new Map<string, {
            currency: string;
            bought: number;
            spent: number;
            remaining: number;
            avgRate: number;
            totalCost: number;
            transactions: TripFund[];
            spendings: TripExpense[];
        }>();

        // Process funds (Money In)
        funds.forEach(fund => {
            if (!currencyMap.has(fund.currency)) {
                currencyMap.set(fund.currency, {
                    currency: fund.currency,
                    bought: 0,
                    spent: 0,
                    remaining: 0,
                    avgRate: 0,
                    totalCost: 0,
                    transactions: [],
                    spendings: []
                });
            }

            const entry = currencyMap.get(fund.currency)!;
            entry.bought += fund.amount;
            entry.totalCost += fund.baseAmount;
            entry.transactions.push(fund);
        });

        // Process expenses (Money Out)
        expenses.forEach(exp => {
            if (!currencyMap.has(exp.currency)) {
                // If expense exists but no fund was explicitly added (e.g. card payment in foreign currency directly)
                // We should arguably still track it, but maybe as negative remaining or just tracked spend.
                // For now, let's initialize it.
                currencyMap.set(exp.currency, {
                    currency: exp.currency,
                    bought: 0,
                    spent: 0,
                    remaining: 0,
                    avgRate: 0,
                    totalCost: 0,
                    transactions: [],
                    spendings: []
                });
            }
            const entry = currencyMap.get(exp.currency)!;
            entry.spent += exp.amount;
            entry.spendings.push(exp);
        });

        // Calculate averages and remaining
        Array.from(currencyMap.values()).forEach(entry => {
            entry.remaining = entry.bought - entry.spent;
            entry.avgRate = entry.bought > 0 ? entry.totalCost / entry.bought : 0;

            // Sort transactions by date
            entry.transactions.sort((a, b) => b.date.toMillis() - a.date.toMillis());
            entry.spendings.sort((a, b) => b.date.toMillis() - a.date.toMillis());
        });

        return Array.from(currencyMap.values()).filter(c => c.currency !== householdCurrency);
    }, [funds, expenses, householdCurrency]);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Wallet className="h-5 w-5" /> Currency Wallet
            </h2>

            {balances.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg">
                    No foreign currency transactions found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {balances.map(balance => (
                        <Card key={balance.currency} className="overflow-hidden">
                            <CardHeader className="bg-primary/5 pb-2">
                                <CardTitle className="flex justify-between items-center text-lg">
                                    <div className="flex items-center gap-2">
                                        <Coins className="h-5 w-5 text-primary" />
                                        {balance.currency}
                                    </div>
                                    <div className="text-sm font-normal text-muted-foreground bg-background px-2 py-1 rounded border">
                                        Avg Rate: {balance.avgRate.toFixed(2)}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Bought</p>
                                        <p className="text-xl font-bold text-green-600">
                                            {balance.bought.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Remaining</p>
                                        <p className={`text-xl font-bold ${balance.remaining < 0 ? 'text-red-500' : 'text-primary'}`}>
                                            {balance.remaining.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm items-center border-t pt-2">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <TrendingDown className="h-3 w-3" /> Spent
                                        </span>
                                        <span className="font-medium">
                                            {balance.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                <Tabs defaultValue="exchanges" className="w-full mt-4">
                                    <TabsList className="grid w-full grid-cols-2 h-8">
                                        <TabsTrigger value="exchanges" className="text-xs">Exchanges</TabsTrigger>
                                        <TabsTrigger value="spending" className="text-xs">Top Events</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="exchanges" className="max-h-[150px] overflow-y-auto space-y-2 pt-2">
                                        {balance.transactions.filter(t => t.source === 'exchange').length > 0 ? (
                                            balance.transactions.filter(t => t.source === 'exchange').map(t => (
                                                <div key={t.id} className="text-xs flex justify-between items-center bg-muted/30 p-2 rounded">
                                                    <div>
                                                        <div className="font-medium flex items-center gap-1">
                                                            <Globe className="h-3 w-3" />
                                                            {t.exchangeLocation || 'Unknown Exchange'}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {t.date.toDate().toLocaleDateString()} • {t.country}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-green-600">+{t.amount}</div>
                                                        <div className="text-[10px] text-muted-foreground">Rate: {t.conversionRate.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground text-center py-2">No currency exchanges recorded.</p>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="spending" className="max-h-[150px] overflow-y-auto space-y-2 pt-2">
                                        {balance.spendings.slice(0, 5).map(s => (
                                            <div key={s.id} className="text-xs flex justify-between items-center border-b last:border-0 pb-1">
                                                <div className="truncate max-w-[120px]">
                                                    <div className="font-medium">{s.category}</div>
                                                    <div className="text-[10px] text-muted-foreground">{s.date.toDate().toLocaleDateString()}</div>
                                                </div>
                                                <div className="font-medium">-{s.amount}</div>
                                            </div>
                                        ))}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
