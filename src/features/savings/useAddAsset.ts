import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/features/auth/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Asset, UserProfile } from '@/types';
import { assetService } from '@/lib/api/assets';
import { getAssetSchema, baseAssetSchema, ASSET_META_SCHEMAS } from './assetSchemas';
import { ASSET_TYPES } from '@/lib/constants';

// We use a loose type for the form to accommodate dynamic fields
type AssetFormValues = z.infer<typeof baseAssetSchema> & Record<string, any>;

export function useAddAsset(
    assetToEdit?: Asset,
    open?: boolean,
    setOpen?: (open: boolean) => void
) {
    const { user, profile, household } = useAuth();
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<UserProfile[]>([]);

    useEffect(() => {
        const fetchMembers = async () => {
            if (profile?.householdId) {
                try {
                    const q = query(collection(db, 'users'), where('householdId', '==', profile.householdId));
                    const snapshot = await getDocs(q);
                    const fetchedMembers = snapshot.docs.map(d => d.data() as UserProfile);
                    setMembers(fetchedMembers);
                } catch (err) {
                    console.error("Error fetching members", err);
                }
            }
        };
        fetchMembers();
    }, [profile?.householdId]);

    const form = useForm<AssetFormValues>({
        // Dynamic resolver: decides schema based on 'type' field
        // @ts-ignore: async resolver type mismatch with loose form values
        resolver: async (values, context, options) => {
            const type = values.type || 'FD';
            const schema = getAssetSchema(type);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return zodResolver(schema)(values, context, options as any);
        },
        defaultValues: {
            type: 'FD',
            buyDate: new Date().toISOString().split('T')[0],
            ownerIds: [],
        },
    });

    // Populate form on edit or reset on open
    useEffect(() => {
        if (assetToEdit) {
            const baseValues = {
                name: assetToEdit.name,
                type: assetToEdit.type,
                amountInvested: assetToEdit.amountInvested.toString(),
                currentValue: (assetToEdit.currentValue || assetToEdit.amountInvested).toString(),
                buyDate: assetToEdit.buyDate.toDate().toISOString().split('T')[0],
                source: assetToEdit.source || '',
                ownerIds: assetToEdit.ownerIds && assetToEdit.ownerIds.length > 0
                    ? assetToEdit.ownerIds
                    : [assetToEdit.ownerUserId]
            };
            // Merge meta fields into the top level for the form
            const merged = { ...baseValues, ...(assetToEdit.meta || {}) };
            form.reset(merged);
        } else if (open && user) {
            form.reset({
                type: 'FD',
                buyDate: new Date().toISOString().split('T')[0],
                name: '',
                amountInvested: '',
                currentValue: '',
                source: '',
                ownerIds: [user.uid],
                // Clear potential old dynamic fields
            });
        }
    }, [assetToEdit, open, user, form]);

    const submitAsset = async (data: AssetFormValues) => {
        if (!user || !profile?.householdId) return;
        setLoading(true);

        try {
            const invested = parseFloat(data.amountInvested);
            const current = data.currentValue ? parseFloat(data.currentValue) : invested;

            // Extract standard fields
            const standardKeys = Object.keys(baseAssetSchema.shape);
            // Dynamic fields are everything else
            const meta: Record<string, any> = {};

            // Explicitly add foreign currency fields to meta
            if (data.isForeignCurrency) {
                meta.isForeignCurrency = data.isForeignCurrency;
                meta.originalCurrency = data.originalCurrency;
                meta.originalAmount = data.originalAmount;
                meta.exchangeRate = data.exchangeRate;
            }

            Object.keys(data).forEach(key => {
                // We exclude foreign fields from automatic extraction if they are already handled or if we want them in meta 
                // but since they are in baseSchema, they are 'standard'. 
                // We want to force them into meta.
                const isForeignField = ['isForeignCurrency', 'originalCurrency', 'originalAmount', 'exchangeRate'].includes(key);
                if (!standardKeys.includes(key) && !isForeignField) {
                    meta[key] = data[key];
                }
            });

            const payload = {
                name: data.name,
                type: data.type,
                amountInvested: invested,
                currentValue: current,
                buyDate: Timestamp.fromDate(new Date(data.buyDate)),
                source: data.source,
                ownerIds: data.ownerIds,
                meta: meta, // Save dynamic fields here
            };

            if (assetToEdit) {
                // We need to extend the updateAsset types to accept meta, 
                // but for now let's cast or assume the service handles specific fields roughly.
                // The service likely spreads data, so 'meta' should pass through if we update the interface there.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await assetService.updateAsset(assetToEdit.id, payload as any);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await assetService.addAsset(payload as any, profile.householdId, user.uid, household?.currency || 'USD');
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
        ASSET_TYPES,
        members,
        ASSET_META_SCHEMAS // Export to help UI determine fields
    };
}
