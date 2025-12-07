'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Home, AlertCircle } from 'lucide-react';
import { Household } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { generateHouseholdKey, exportKey } from '@/lib/crypto';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const onboardingSchema = z.object({
    householdName: z.string().min(2, "Household name must be at least 2 characters"),
    currency: z.string(),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export function OnboardingFlow() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [existingHousehold, setExistingHousehold] = useState<Household | null>(null);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<OnboardingFormValues>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            householdName: '',
            currency: 'USD',
        },
    });

    const createHousehold = async (data: OnboardingFormValues) => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const householdId = uuidv4();
            const key = await generateHouseholdKey();
            const exportedKey = await exportKey(key);

            const newHousehold: Household = {
                id: householdId,
                name: data.householdName,
                name_lower: data.householdName.toLowerCase(), // Save normalized name
                currency: data.currency,
                memberIds: [user.uid],
                createdAt: serverTimestamp() as any,
                encryptedKeys: {
                    [user.uid]: exportedKey
                }
            };

            await setDoc(doc(db, 'households', householdId), newHousehold);

            await updateDoc(doc(db, 'users', user.uid), {
                householdId: householdId,
                role: 'admin'
            });

            // Reload not needed due to AuthContext onSnapshot, but safe to keep for full reset
            // window.location.reload(); 
        } catch (error: any) {
            console.error("Error creating household:", error);
            setError("Failed to create household. " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const joinHousehold = async () => {
        if (!user || !existingHousehold) return;
        setLoading(true);
        setError(null);

        try {
            // Add user to household.memberIds
            await updateDoc(doc(db, 'households', existingHousehold.id), {
                memberIds: arrayUnion(user.uid)
            });

            // Update User Profile
            await updateDoc(doc(db, 'users', user.uid), {
                householdId: existingHousehold.id,
                role: 'user'
            });

        } catch (error: any) {
            console.error("Error joining household:", error);
            setError("Failed to join household. " + error.message);
        } finally {
            setLoading(false);
        }
    }

    const onSubmit: SubmitHandler<OnboardingFormValues> = async (data) => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            // Check if household exists by NAME
            // Strategy: 
            // 1. Try querying 'name_lower' (new robust way)
            // 2. Try querying 'name' (legacy way)
            // 3. Merge results

            const queries = [
                query(collection(db, 'households'), where('name_lower', '==', data.householdName.toLowerCase())),
                query(collection(db, 'households'), where('name', '==', data.householdName))
            ];

            const results = await Promise.all(queries.map(q => getDocs(q)));

            // Find first non-empty result
            let foundDoc = null;
            for (const snap of results) {
                if (!snap.empty) {
                    foundDoc = snap.docs[0];
                    break;
                }
            }

            if (foundDoc) {
                // Household exists
                const householdRequest = foundDoc.data() as Household;
                householdRequest.id = foundDoc.id;
                setExistingHousehold(householdRequest);
                setLoading(false);
            } else {
                // Create new
                await createHousehold(data);
            }

        } catch (error: any) {
            console.error("Error checking household:", error);
            setLoading(false);
            setError("Error checking availability: " + error.message + ". Please try again.");
            // DO NOT fallback to createHousehold blindly.
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/20 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Home className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-center text-2xl">Welcome to Family Finance</CardTitle>
                    <CardDescription className="text-center">
                        Let's set up your fast and secure family finance hub.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="householdName">Family/Household Name</Label>
                            <Input
                                id="householdName"
                                placeholder="e.g. The Smiths, Our Home"
                                {...form.register('householdName')}
                            />
                            {form.formState.errors.householdName && (
                                <p className="text-sm text-destructive">{form.formState.errors.householdName.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Exact match required to join an existing family (Case Sensitive).
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Primary Currency</Label>
                            <Select
                                onValueChange={(val) => form.setValue('currency', val)}
                                defaultValue="USD"
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="LKR">LKR (Rs)</SelectItem>
                                    <SelectItem value="AED">AED (AED)</SelectItem>
                                    <SelectItem value="INR">INR (₹)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full mt-4" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create (or Join) Household
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Join Confirmation Dialog */}
            <Dialog open={!!existingHousehold} onOpenChange={(open) => !open && setExistingHousehold(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Household Found!</DialogTitle>
                        <DialogDescription asChild>
                            <div className="pt-2 text-sm text-muted-foreground">
                                A household named <span className="font-bold text-foreground">{existingHousehold?.name}</span> already exists.
                                <br /><br />
                                Do you want to <span className="font-bold">Join</span> this household?
                                <br />
                                If you join, you will share transaction data with existing members.
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2 mb-4">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setExistingHousehold(null)}>Cancel</Button>
                        <Button onClick={joinHousehold} disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, Join Household"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
