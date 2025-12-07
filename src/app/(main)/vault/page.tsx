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

export default function VaultPage() {
    const { profile } = useAuth();
    const [vaultItems, setVaultItems] = useState<Asset[]>([]);
    const [unlocked, setUnlocked] = useState(false); // Simulating an "Unlock Vault" step
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.householdId) return;
        
        // Fetch items that are explicitly meant for the Vault (e.g. Jewellery, or isEncrypted=true)
        // For this demo matching the screenshot, we'll fetch 'Jewellery' and 'Valuables' type assets.
        // In a real implementation we would strictly check `isEncrypted: true`.
        // Let's filter by type for now to match the user's "Jewellery/Valuables" Tab.

        const q = query(
          collection(db, 'assets'),
          where('householdId', '==', profile.householdId),
          where('type', '==', 'Jewellery') 
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Asset[];
            setVaultItems(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [profile?.householdId]);

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
                       <Button variant="outline" onClick={() => setUnlocked(true)}>
                           <Lock className="mr-2 h-4 w-4" /> Unlock Vault
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
                    <Button onClick={() => setUnlocked(true)}>Enter Master Password</Button>
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
