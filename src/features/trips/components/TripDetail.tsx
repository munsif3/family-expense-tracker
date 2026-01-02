'use client';

import { useState } from 'react';
import { useTrip } from '../hooks/useTrip';
import { useTripFunds, useTripExpenses, useTripReturns } from '../hooks/useTripData';
import { useTripCalculations } from '../hooks/useTripCalculations';
import { useTripParticipants } from '../hooks/useTripParticipants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Plus, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toJsDate, formatCurrency } from '@/lib/utils';

import { useAuth } from '@/features/auth/AuthContext';
import { AddTripFundModal } from './AddTripFundModal';
import { AddTripExpenseModal } from './AddTripExpenseModal';
import { AddTripReturnModal } from './AddTripReturnModal';
import { TripFundsList } from './TripFundsList';
import { TripExpensesList } from './TripExpensesList';
import { TripReturnsList } from './TripReturnsList';
import { TripAnalytics } from './TripAnalytics';
import { TripCurrencyWallet } from './TripCurrencyWallet';
import { EditTripModal } from './EditTripModal';
import { Settings as SettingsIcon } from 'lucide-react';

interface TripDetailProps {
    id: string;
}

export function TripDetail({ id }: TripDetailProps) {
    const { household } = useAuth();
    const householdCurrency = household?.currency || 'Base';

    const router = useRouter();
    const { trip, loading: tripLoading } = useTrip(id);
    const { funds, fundsLoading } = useTripFunds(id);
    const { expenses, expensesLoading } = useTripExpenses(id);
    const { returns, returnsLoading } = useTripReturns(id);

    const { participants, loading: participantsLoading } = useTripParticipants(
        Array.from(new Set([
            ...(trip?.participantIds || []),
            ...(funds?.map(f => f.contributorId) || []),
            ...(expenses?.map(e => e.paidBy) || []),
            ...(returns?.map(r => r.receivedBy || '') || []).filter(id => id)
        ]))
    );

    const { totals, byUser, bySource } = useTripCalculations(funds, expenses, returns);

    const [isFundModalOpen, setIsFundModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    if (tripLoading || fundsLoading || expensesLoading || returnsLoading || participantsLoading) {
        return <LoadingSpinner fullScreen />;
    }

    if (!trip) {
        return <div>Trip not found</div>;
    }

    const getName = (uid: string) => participants.find(p => p.uid === uid)?.displayName || uid;

    return (
        <div className="space-y-6">
            <div>
                <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0 hover:bg-transparent hover:text-primary/80">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Trips
                </Button>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">{trip.tripName}</h1>
                            <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(true)}>
                                <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </div>
                        <p className="text-muted-foreground">{trip.location} • {format(toJsDate(trip.startDate), 'MMM d')} - {format(toJsDate(trip.endDate), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Net Cost</p>
                        <p className="text-2xl font-bold mb-4">{formatCurrency(totals.netCost)} <span className="text-sm font-normal text-muted-foreground">Base</span></p>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setIsFundModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Fund</Button>
                            <Button size="sm" onClick={() => setIsExpenseModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Funds</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(totals.totalFunds)} <span className="text-sm font-normal text-muted-foreground">{householdCurrency}</span></div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Expenses</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(totals.totalExpenses)} <span className="text-sm font-normal text-muted-foreground">{householdCurrency}</span></div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Returns</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{formatCurrency(totals.totalReturns)} <span className="text-sm font-normal text-muted-foreground">{householdCurrency}</span></div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Remaining Funds</CardTitle></CardHeader>
                    <CardContent><div className={`text-2xl font-bold ${totals.remainingFunds < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(totals.remainingFunds)} <span className="text-sm font-normal text-muted-foreground">{householdCurrency}</span></div></CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="funds">Funds</TabsTrigger>
                    <TabsTrigger value="wallet">Wallet</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="returns">Returns</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Member Breakdown</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {Object.entries(byUser).map(([userId, stats]) => (
                                    <div key={userId} className="flex justify-between items-center py-2 border-b last:border-0">
                                        <span className="font-medium">{getName(userId)}</span>
                                        <div className="flex gap-4 text-sm">
                                            <span className="text-green-600">In: {formatCurrency(stats.contributed)}</span>
                                            <span className="text-red-600">Out: {formatCurrency(stats.spent)}</span>
                                            {stats.received > 0 && <span className="text-blue-600">Got: {formatCurrency(stats.received)}</span>}
                                            <span className={stats.balance >= 0 ? 'text-gray-900 font-bold' : 'text-red-900 font-bold'}>
                                                Net: {formatCurrency(stats.balance)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="funds" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Assets (Savings)</CardTitle></CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(bySource.asset.totalBase)} <span className="text-sm font-normal text-muted-foreground">{householdCurrency}</span></div>
                                <p className="text-xs text-muted-foreground">{bySource.asset.count} contributions</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Exchange (Bought)</CardTitle></CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(bySource.exchange.totalBase)} <span className="text-sm font-normal text-muted-foreground">{householdCurrency}</span></div>
                                <p className="text-xs text-muted-foreground">{bySource.exchange.count} contributions</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Travel Funds</h3>
                        <Button size="sm" onClick={() => setIsFundModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Fund</Button>
                    </div>
                    <TripFundsList funds={funds} participants={participants} onAdd={() => setIsFundModalOpen(true)} />
                </TabsContent>
                <TabsContent value="wallet" className="space-y-4">
                    <TripCurrencyWallet trip={trip} funds={funds} expenses={expenses} householdCurrency={householdCurrency} participants={participants} />
                </TabsContent>
                <TabsContent value="expenses" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Expenses</h3>
                        <Button size="sm" onClick={() => setIsExpenseModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
                    </div>
                    <TripExpensesList tripId={id} tripName={trip.tripName} expenses={expenses} participants={participants} onAdd={() => setIsExpenseModalOpen(true)} />
                </TabsContent>
                <TabsContent value="returns" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Returns / Refunds</h3>
                        <Button size="sm" onClick={() => setIsReturnModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Return</Button>
                    </div>
                    <TripReturnsList returns={returns} participants={participants} onAdd={() => setIsReturnModalOpen(true)} />
                </TabsContent>
                <TabsContent value="analytics" className="space-y-4">
                    <TripAnalytics funds={funds} expenses={expenses} returns={returns} participants={participants} />
                </TabsContent>
            </Tabs>

            <AddTripFundModal
                tripId={id}
                participants={participants}
                open={isFundModalOpen}
                onOpenChange={setIsFundModalOpen}
            />

            <AddTripExpenseModal
                tripId={id}
                tripName={trip.tripName}
                participants={participants}
                open={isExpenseModalOpen}
                onOpenChange={setIsExpenseModalOpen}
            />

            <AddTripReturnModal
                tripId={id}
                tripName={trip.tripName}
                participants={participants}
                open={isReturnModalOpen}
                onOpenChange={setIsReturnModalOpen}
            />

            <EditTripModal
                trip={trip}
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
            />
        </div>
    );
}
