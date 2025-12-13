import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Asset } from '@/types';
import { Landmark, Gem, TrendingUp, Building2, Bitcoin, Wallet, LucideIcon } from 'lucide-react';

export const ASSET_ICONS: Record<string, LucideIcon> = {
    'FD': Landmark,
    'Gold': Gem,
    'Jewellery': Gem,
    'Stock': TrendingUp,
    'Property': Building2,
    'Crypto': Bitcoin,
    'MonthlySaving': Wallet
};

export function useSavings() {
    const { profile, household } = useAuth();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const currency = household?.currency || 'USD';
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);

    useEffect(() => {
        if (!profile?.householdId) return;

        const q = query(
            collection(db, 'assets'),
            where('householdId', '==', profile.householdId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Asset[];
            setAssets(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.householdId]);

    const stats = useMemo(() => {
        let totalInvested = 0;
        let totalCurrent = 0;
        assets.forEach(a => {
            totalInvested += a.amountInvested;
            totalCurrent += (a.currentValue || a.amountInvested);
        });
        const gain = totalCurrent - totalInvested;
        const gainPercent = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
        return { totalCurrent, gain, gainPercent };
    }, [assets]);

    const grouped = useMemo(() => {
        const groups: Record<string, Asset[]> = {};
        assets.forEach(a => {
            if (!groups[a.type]) groups[a.type] = [];
            groups[a.type].push(a);
        });
        return groups;
    }, [assets]);

    const handleDelete = async () => {
        if (!deletingAsset) return;
        try {
            await deleteDoc(doc(db, 'assets', deletingAsset.id));
            setDeletingAsset(null);
        } catch (error) {
            console.error("Error deleting asset:", error);
        }
    }

    const [openAdd, setOpenAdd] = useState(false);

    // ... existing useEffect ...

    // ... existing stats/grouped calc ...

    // ... existing handleDelete ...

    return {
        assets,
        loading,
        currency,
        stats,
        grouped,
        assetToEdit: editingAsset,
        setAssetToEdit: setEditingAsset,
        openAdd,
        setOpenAdd,
        deletingAsset,
        setDeletingAsset,
        handleDelete,
        ASSET_ICONS
    };
}
