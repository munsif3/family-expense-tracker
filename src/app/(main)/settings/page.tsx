'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, User, ShieldAlert, CreditCard, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { doc, updateDoc, arrayRemove, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PaymentMethod } from '@/types';
import { paymentMethodService } from '@/lib/api/paymentMethods';
import { Badge } from '@/components/ui/badge';



export default function SettingsPage() {
    const { user, profile } = useAuth();
    // const router = useRouter(); // Unused
    const [loading, setLoading] = useState(false);
    // State for Leave Household
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [householdName, setHouseholdName] = useState<string>('');
    const [currency, setCurrency] = useState<string>('USD');

    // State for Delete Data
    const [showDeleteDataDialog, setShowDeleteDataDialog] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Fetch household name when profile loads
    useEffect(() => {
        const fetchHousehold = async () => {
            if (profile?.householdId) {
                try {
                    const docRef = doc(db, 'households', profile.householdId);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        setHouseholdName(snap.data().name);
                        setCurrency(snap.data().currency);
                    }
                } catch (err: unknown) {
                    console.error("Error fetching household:", err);
                    if ((err as { code?: string }).code === 'permission-denied') {
                        setHouseholdName("Access Denied (Please Leave)");
                    }
                }
            }
        };
        fetchHousehold();
    }, [profile?.householdId]);

    // Payment Methods Logic
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [newMethodName, setNewMethodName] = useState('');
    const [newMethodIsCommon, setNewMethodIsCommon] = useState(true);
    const [pmLoading, setPmLoading] = useState(false);

    const refreshPaymentMethods = useCallback(async () => {
        if (!profile?.householdId) return;
        const methods = await paymentMethodService.getPaymentMethods(profile.householdId);
        setPaymentMethods(methods);
    }, [profile?.householdId]);

    useEffect(() => {
        if (profile?.householdId) refreshPaymentMethods();
    }, [profile?.householdId, refreshPaymentMethods]);

    const handleAddPaymentMethod = async () => {
        if (!newMethodName.trim() || !profile?.householdId) return;
        setPmLoading(true);
        try {
            await paymentMethodService.addPaymentMethod({
                householdId: profile.householdId,
                name: newMethodName,
                type: 'credit_card', // Defaulting to credit card for now
                isCommon: newMethodIsCommon,
            });
            setNewMethodName('');
            setNewMethodIsCommon(true);
            refreshPaymentMethods();
        } catch (e) { console.error(e); }
        setPmLoading(false);
    };

    const handleDeletePaymentMethod = async (id: string) => {
        if (!window.confirm('Delete this payment method?')) return;
        try {
            await paymentMethodService.deletePaymentMethod(id);
            refreshPaymentMethods();
        } catch (e) { console.error(e); }
    };

    const handleLeaveHousehold = async () => {
        if (!user || !profile?.householdId) return;
        setLoading(true);

        try {
            // 1. Remove user from household members
            try {
                const householdRef = doc(db, 'households', profile.householdId);
                await updateDoc(householdRef, {
                    memberIds: arrayRemove(user.uid)
                });
            } catch (innerError) {
                console.warn("Could not remove from household members (likely already removed or permission denied):", innerError);
            }

            // 2. Clear householdId from user profile
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                householdId: null,
                role: 'user'
            });

        } catch (error) {
            console.error("Error leaving household:", error);
            setLoading(false);
            setShowLeaveDialog(false);
        }
    };

    const handleDeleteAllData = async () => {
        if (!user || !profile?.householdId) return;

        // Security check
        if (deleteConfirmation !== 'DELETE') {
            return;
        }

        setDeleteLoading(true);

        try {
            const hId = profile.householdId;
            // const batchSize = 400; // Safety margin below 500 limit

            // Helper to delete query results in batches
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const deleteQueryBatch = async (collectionName: string, qConstraint: any) => {
                const q = query(collection(db, collectionName), ...qConstraint);
                const snapshot = await getDocs(q);

                if (snapshot.size === 0) return;

                const batch = writeBatch(db);
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log(`Deleted ${snapshot.size} docs from ${collectionName}`);
            };

            // 1. Transactions
            await deleteQueryBatch('transactions', [where('householdId', '==', hId)]);

            // 2. Recurring Transactions
            await deleteQueryBatch('recurring_transactions', [where('householdId', '==', hId)]);

            // 3. Budgets (Categories)
            await deleteQueryBatch('categories', [where('householdId', '==', hId)]);

            // 4. Assets / Savings
            await deleteQueryBatch('assets', [where('householdId', '==', hId)]);

            // 5. Goals
            await deleteQueryBatch('goals', [where('householdId', '==', hId)]);

            // 6. Trips (Only those created by this user or implicit household trips - simplifying to participant check)
            // Note: This matches trips where the current user is a participant. 
            // Ideally we'd filter by purely household trips, but trips don't strictly have a householdId in the root.
            // Based on previous analysis, we'll try to wipe trips associated with the user for now as a "test data reset".
            await deleteQueryBatch('trips', [where('participantIds', 'array-contains', user.uid)]);

            setDeleteLoading(false);
            setShowDeleteDataDialog(false);
            setDeleteConfirmation('');

            // Optional: Show success toast or reload
            alert("All household data has been deleted.");
            window.location.reload();

        } catch (error) {
            console.error("Error deleting data:", error);
            setDeleteLoading(false);
            alert("Failed to delete some data. Check console.");
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and household preferences.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        <CardTitle>Profile Information</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Display Name</Label>
                        <Input value={user?.displayName || ''} disabled readOnly className="bg-muted" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Email Address</Label>
                        <Input value={user?.email || ''} disabled readOnly className="bg-muted" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-primary" />
                        <CardTitle>Household Settings</CardTitle>
                    </div>
                    <CardDescription>
                        Details about your currently connected family.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Household Name</Label>
                        <Input value={householdName || 'Loading...'} disabled readOnly className="bg-muted" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Currency</Label>
                        <Input value={currency} disabled readOnly className="bg-muted" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <CardTitle>Payment Methods</CardTitle>
                    </div>
                    <CardDescription>
                        Manage sources of funds. &quot;Common&quot; methods are treated as shared expenses.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        {paymentMethods.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No payment methods added yet.</p>
                        )}
                        {paymentMethods.map(pm => (
                            <div key={pm.id} className="flex items-center justify-between p-3 border rounded-lg bg-card text-card-foreground shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <CreditCard className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{pm.name}</p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={pm.isCommon ? "default" : "secondary"} className="text-[10px] h-5">
                                                {pm.isCommon ? 'Common / Shared' : 'Personal'}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground capitalize">{pm.type.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeletePaymentMethod(pm.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-3">Add New Method</h4>
                        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] items-end">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    placeholder="e.g. Amex Gold, Joint Account"
                                    value={newMethodName}
                                    onChange={(e) => setNewMethodName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 pb-3">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="newPmCommon"
                                        className="h-4 w-4 rounded border-gray-300"
                                        checked={newMethodIsCommon}
                                        onChange={(e) => setNewMethodIsCommon(e.target.checked)}
                                    />
                                    <Label htmlFor="newPmCommon" className="font-normal cursor-pointer text-sm">
                                        Is Common?
                                    </Label>
                                </div>
                            </div>
                            <Button onClick={handleAddPaymentMethod} disabled={pmLoading || !newMethodName}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-900 overflow-hidden">
                <CardHeader className="bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <ShieldAlert className="h-5 w-5" />
                        <CardTitle>Danger Zone</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {/* LEAVE HOUSEHOLD */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="font-medium">Leave Household</h4>
                            <p className="text-sm text-muted-foreground">
                                Disconnect from <strong>{householdName}</strong>. You will be returned to the setup screen.
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={() => setShowLeaveDialog(true)}
                            disabled={loading}
                        >
                            Leave Household
                        </Button>
                    </div>

                    <div className="border-t border-red-100 dark:border-red-900/50" />

                    {/* DELETE ALL DATA */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h4 className="font-medium">Delete All Data</h4>
                            <p className="text-sm text-muted-foreground">
                                Permanently delete <strong>all transactions, goals, assets, and trips</strong> for this household.
                                <br />members will remain.
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={() => setShowDeleteDataDialog(true)}
                            disabled={loading || deleteLoading}
                        >
                            Delete Data
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Leave Confirmation Dialog */}
            <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            Leave {householdName}?
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="pt-2 text-sm text-muted-foreground">
                                Are you sure you want to leave this household?
                                <ul className="list-disc list-inside mt-2 space-y-1 text-foreground">
                                    <li>You will lose access to shared transactions and assets.</li>
                                    <li>Your contributed data will remain with the household.</li>
                                    <li>You will be redirected to the onboarding/join screen.</li>
                                </ul>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleLeaveHousehold} disabled={loading}>
                            {loading ? 'Leaving...' : 'Yes, Leave Household'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Data Confirmation Dialog */}
            <Dialog open={showDeleteDataDialog} onOpenChange={setShowDeleteDataDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            DELETE ALL DATA?
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="pt-2 text-sm text-muted-foreground space-y-4">
                                <p className="font-bold text-red-500">
                                    WARNING: THIS ACTION CANNOT BE UNDONE.
                                </p>
                                <p>
                                    You are about to permanently delete ALL financial records for <strong>{householdName}</strong>.
                                    This includes everything in Dashboard, Transactions, Savings, Goals, and Trips.
                                </p>
                                <p>
                                    To confirm, type <strong>DELETE</strong> below:
                                </p>
                                <Input
                                    value={deleteConfirmation}
                                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                                    placeholder="Type DELETE to confirm"
                                    className="border-red-300 focus-visible:ring-red-500"
                                />
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setShowDeleteDataDialog(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAllData}
                            disabled={deleteLoading || deleteConfirmation !== 'DELETE'}
                        >
                            {deleteLoading ? 'Deleting...' : 'Permanently Delete Data'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
