'use client';


import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Home, AlertCircle } from 'lucide-react';
import { Household } from '@/types';
import { useOnboarding } from './useOnboarding';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const onboardingSchema = z.object({
    householdName: z.string().min(2, "Household name must be at least 2 characters"),
    currency: z.string(),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export function OnboardingFlow() {
    const {
        loading,
        error,
        existingHousehold,
        checkAndProceed,
        joinHousehold,
        reset
    } = useOnboarding();

    const form = useForm<OnboardingFormValues>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            householdName: '',
            currency: 'USD',
        },
    });

    const onSubmit: SubmitHandler<OnboardingFormValues> = async (data) => {
        await checkAndProceed(data.householdName, data.currency);
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
            <Dialog open={!!existingHousehold} onOpenChange={(open) => !open && reset()}>
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
                        <Button variant="ghost" onClick={reset}>Cancel</Button>
                        <Button onClick={joinHousehold} disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, Join Household"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
