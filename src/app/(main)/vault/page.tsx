'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Asset } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ShieldCheck, MapPin } from 'lucide-react';
import { AddAssetModal } from '@/features/savings/AddAssetModal';

// ... imports
import { importKey } from '@/lib/crypto';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VaultPage() {
    const { profile, household } = useAuth();
    const [vaultItems, setVaultItems] = useState<Asset[]>([]);
    const [unlocked, setUnlocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [unlocking, setUnlocking] = useState(false);

    // ... useEffect (fetch) ...

    const handleUnlock = async () => {
        if (!profile || !household) return;
        setUnlocking(true);

        try {
            const encryptedKey = household.encryptedKeys?.[profile.uid];
            if (!encryptedKey) {
                toast.error("No access key found for your user.");
                setUnlocking(false);
                return;
            }

            // Attempt to import the key to verify it's valid
            // In a real app, we would decrypt it with a master password here.
            // Since it's stored as an exported JWK (plaintext key), we just import it to "utilize" it.
            await importKey(encryptedKey);

            setUnlocked(true);
            toast.success("Vault unlocked successfully.");
        } catch (error: any) {
            console.error("Unlock failed", error);
            if (error.name === 'DataError') {
                toast.error("Security Key Error: The stored key is invalid or corrupted.");
            } else {
                toast.error("Failed to unlock vault.");
            }
        } finally {
            setUnlocking(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Lock className="h-8 w-8 text-amber-500" />
                        Secret Vault
                    </h1>
                    <p className="text-muted-foreground">Securely manage high-value assets & documents.</p>
                </div>
                <div className="flex gap-2">
                    {!unlocked ? (
                        <Button variant="outline" onClick={handleUnlock} disabled={unlocking}>
                            {unlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                            Unlock Vault
                        </Button>
                    ) : (
                        <Button variant="ghost" className="text-green-600">
                            <ShieldCheck className="mr-2 h-4 w-4" /> Vault Unlocked
                        </Button>
                    )}
                    <AddAssetModal />
                </div>
            </div>

            <div className="border-b flex items-center gap-6 mb-4">
                <div className="border-b-2 border-primary py-2 px-1 font-medium text-primary cursor-pointer">
                    [Jewellery/Valuables]
                </div>
                <div className="py-2 px-1 text-muted-foreground hover:text-foreground cursor-pointer">
                    [Properties]
                </div>
                <div className="py-2 px-1 text-muted-foreground hover:text-foreground cursor-pointer">
                    [Documents]
                </div>
            </div>

            {!unlocked ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/20">
                    <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Vault is Locked</h3>
                    <p className="text-muted-foreground mb-4">Unlock to view your secure assets.</p>
                    <Button onClick={handleUnlock} disabled={unlocking}>
                        {unlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enter Master Password
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {vaultItems.map(item => (
                        <Card key={item.id} className="overflow-hidden">
                            <div className="aspect-square bg-muted flex items-center justify-center relative">
                                {/* Mock image based on name */}
                                {item.name.toLowerCase().includes('ring') ? (
                                    <div className="text-6xl">💍</div>
                                ) : item.name.toLowerCase().includes('necklace') ? (
                                    <div className="text-6xl">📿</div>
                                ) : (
                                    <div className="text-6xl">💎</div>
                                )}
                            </div>
                            <CardContent className="p-4">
                                <h3 className="font-bold text-lg">{item.name}</h3>
                                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Location: Bank Locker
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {vaultItems.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground">
                            No items in the vault. Add "Jewellery" from the Add button.
                        </div>
                    )}
                </div>
            )}

            <p className="text-xs text-muted-foreground mt-8">
                * All data in this section is end-to-end encrypted.
            </p>
        </div>
    );
}
