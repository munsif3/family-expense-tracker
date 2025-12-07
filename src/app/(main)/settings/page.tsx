'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LogOut, AlertCircle, Home, User, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { doc, updateDoc, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [householdName, setHouseholdName] = useState<string>('');
    const [currency, setCurrency] = useState<string>('USD');

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
                } catch (err: any) {
                    console.error("Error fetching household:", err);
                    if (err.code === 'permission-denied') {
                        setHouseholdName("Access Denied (Please Leave)");
                    }
                }
            }
        };
        fetchHousehold();
    }, [profile?.householdId]);

    const handleLeaveHousehold = async () => {
        if (!user || !profile?.householdId) return;
        setLoading(true);

        try {
            // 1. Remove user from household members
            // We wrap this in a try-catch to allow "force leaving" if permissions are already broken
            try {
                const householdRef = doc(db, 'households', profile.householdId);
                await updateDoc(householdRef, {
                    memberIds: arrayRemove(user.uid)
                });
            } catch (innerError) {
                console.warn("Could not remove from household members (likely already removed or permission denied):", innerError);
                // Proceed to step 2 anyway
            }

            // 2. Clear householdId from user profile
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                householdId: null,
                role: 'user'
            });

            // NOTE: No need to reload. AuthContext onSnapshot will catch the profile change
            // and DashboardLayout will redirect to OnboardingFlow automatically.

        } catch (error) {
            console.error("Error leaving household:", error);
            setLoading(false);
            setShowLeaveDialog(false);
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

            <Card className="border-red-200 dark:border-red-900 overflow-hidden">
                <CardHeader className="bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <ShieldAlert className="h-5 w-5" />
                        <CardTitle>Danger Zone</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
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
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
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
        </div>
    );
}
