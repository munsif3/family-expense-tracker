'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { Asset } from '@/types';

const assetSchema = z.object({
    name: z.string().min(2, "Name is required"),
    type: z.string(),
    amountInvested: z.string().min(1, "Amount is required"),
    currentValue: z.string().optional(),
    buyDate: z.string().min(1, "Date is required"),
});

type AssetFormValues = z.infer<typeof assetSchema>;

const ASSET_TYPES = [
    { value: 'FD', label: 'Fixed Deposit' },
    { value: 'Gold', label: 'Gold / Silver' },
    { value: 'Stock', label: 'Stocks / Mutual Funds' },
    { value: 'Property', label: 'Real Estate' },
    { value: 'Crypto', label: 'Crypto' },
    { value: 'Jewellery', label: 'Jewellery' },
];

interface AddAssetModalProps {
    assetToEdit?: Asset;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddAssetModal({ assetToEdit, open: controlledOpen, onOpenChange }: AddAssetModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const { user, profile, household } = useAuth();
    const [loading, setLoading] = useState(false);

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const form = useForm<AssetFormValues>({
        resolver: zodResolver(assetSchema),
        defaultValues: {
            type: 'FD',
            buyDate: new Date().toISOString().split('T')[0],
        },
    });

    useEffect(() => {
        if (assetToEdit) {
            form.reset({
                name: assetToEdit.name,
                type: assetToEdit.type,
                amountInvested: assetToEdit.amountInvested.toString(),
                currentValue: (assetToEdit.currentValue || assetToEdit.amountInvested).toString(),
                buyDate: assetToEdit.buyDate.toDate().toISOString().split('T')[0]
            });
        } else {
            form.reset({
                type: 'FD',
                buyDate: new Date().toISOString().split('T')[0],
                name: '',
                amountInvested: '',
                currentValue: '',
            });
        }
    }, [assetToEdit, isOpen, form]);


    const onSubmit = async (data: AssetFormValues) => {
        if (!user || !profile?.householdId) return;
        setLoading(true);

        try {
            const invested = parseFloat(data.amountInvested);
            const current = data.currentValue ? parseFloat(data.currentValue) : invested; // Default to invested if not provided

            const payload = {
                name: data.name,
                type: data.type,
                amountInvested: invested,
                currentValue: current,
                buyDate: Timestamp.fromDate(new Date(data.buyDate)),
            };

            if (assetToEdit) {
                await updateDoc(doc(db, 'assets', assetToEdit.id), payload);
            } else {
                await addDoc(collection(db, 'assets'), {
                    ...payload,
                    householdId: profile.householdId,
                    ownerUserId: user.uid,
                    currency: household?.currency || 'USD',
                    isEncrypted: false,
                    attachments: [],
                    meta: {},
                    createdAt: serverTimestamp(),
                });
            }

            setOpen(false);
            if (!assetToEdit) form.reset();
        } catch (error) {
            console.error("Error saving asset:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            {!assetToEdit && (
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Investment
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{assetToEdit ? 'Edit Investment' : 'Add New Investment'}</DialogTitle>
                    <DialogDescription>
                        Track your FDs, Gold, Stocks, or other assets.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Type</Label>
                        <div className="col-span-3">
                            <Select
                                onValueChange={(val) => form.setValue('type', val)}
                                defaultValue={form.getValues('type')}
                                value={form.watch('type')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Asset Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ASSET_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" className="col-span-3" placeholder="e.g. HDFC FD #123" {...form.register('name')} />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Invested</Label>
                        <Input id="amount" type="number" step="0.01" className="col-span-3" placeholder="0.00" {...form.register('amountInvested')} />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="current" className="text-right">Cur. Value</Label>
                        <Input id="current" type="number" step="0.01" className="col-span-3" placeholder="(Optional)" {...form.register('currentValue')} />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Buy Date</Label>
                        <Input id="date" type="date" className="col-span-3" {...form.register('buyDate')} />
                    </div>

                    {form.formState.errors.name && <p className="text-red-500 text-xs text-center">{form.formState.errors.name.message}</p>}
                    {form.formState.errors.amountInvested && <p className="text-red-500 text-xs text-center">{form.formState.errors.amountInvested.message}</p>}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (assetToEdit ? 'Update Asset' : 'Save Asset')}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
