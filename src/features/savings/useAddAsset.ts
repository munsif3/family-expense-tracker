import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/features/auth/AuthContext';
import { Asset } from '@/types';
import { assetService } from '@/lib/api/assets';

const assetSchema = z.object({
    name: z.string().min(2, "Name is required"),
    type: z.string(),
    amountInvested: z.string().min(1, "Amount is required"),
    currentValue: z.string().optional(),
    buyDate: z.string().min(1, "Date is required"),
});

export type AssetFormValues = z.infer<typeof assetSchema>;

import { ASSET_TYPES } from '@/lib/constants';

export function useAddAsset(
    assetToEdit?: Asset,
    open?: boolean,
    setOpen?: (open: boolean) => void
) {
    const { user, profile, household } = useAuth();
    const [loading, setLoading] = useState(false);

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
            if (open) {
                form.reset({
                    type: 'FD',
                    buyDate: new Date().toISOString().split('T')[0],
                    name: '',
                    amountInvested: '',
                    currentValue: '',
                });
            }
        }
    }, [assetToEdit, open, form]);

    const submitAsset = async (data: AssetFormValues) => {
        if (!user || !profile?.householdId) return;
        setLoading(true);

        try {
            const invested = parseFloat(data.amountInvested);
            const current = data.currentValue ? parseFloat(data.currentValue) : invested;

            const payload = {
                name: data.name,
                type: data.type,
                amountInvested: invested,
                currentValue: current,
                buyDate: new Date(data.buyDate),
            };

            if (assetToEdit) {
                await assetService.updateAsset(assetToEdit.id, payload);
            } else {
                await assetService.addAsset(payload, profile.householdId, user.uid, household?.currency || 'USD');
            }

            setOpen?.(false);
            if (!assetToEdit) form.reset();
        } catch (error) {
            console.error("Error saving asset:", error);
        } finally {
            setLoading(false);
        }
    };

    return {
        form,
        loading,
        submitAsset,
        ASSET_TYPES
    };
}
