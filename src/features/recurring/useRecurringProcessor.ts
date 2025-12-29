import { useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, getDocs, writeBatch, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RecurringTransaction } from '@/types';

export function useRecurringProcessor() {
    const { profile } = useAuth();

    useEffect(() => {
        if (!profile?.householdId) return;

        const processRecurring = async () => {
            try {
                // 1. Find active recurring transactions that are due (nextRunDate <= now)
                const now = new Date();
                const q = query(
                    collection(db, 'recurring_transactions'),
                    where('householdId', '==', profile.householdId),
                    where('active', '==', true),
                    where('nextRunDate', '<=', Timestamp.fromDate(now))
                );

                const snapshot = await getDocs(q);

                if (snapshot.empty) return;

                const batch = writeBatch(db);
                let processedCount = 0;

                snapshot.docs.forEach(docSnap => {
                    const template = docSnap.data() as RecurringTransaction;
                    const docId = docSnap.id;

                    // 2. Create the new transaction
                    const newTransactionRef = doc(collection(db, 'transactions'));
                    batch.set(newTransactionRef, {
                        householdId: profile.householdId,
                        userId: profile.uid, // Attributed to the user who triggers the process (or system)
                        type: template.type,
                        amount: template.amount,
                        currency: 'USD', // Should ideally fetch from household context, but defaulting for safety
                        categoryId: template.categoryId,
                        description: template.description,
                        date: template.nextRunDate, // Use the scheduled date, not "now", to keep history accurate
                        isRecurring: true,
                        createdAt: serverTimestamp(),
                        attachments: []
                    });

                    // 3. Update the template's nextRunDate
                    const currentRun = template.nextRunDate.toDate();
                    const nextRun = new Date(currentRun);

                    if (template.interval === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
                    else if (template.interval === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);
                    else if (template.interval === 'yearly') nextRun.setFullYear(nextRun.getFullYear() + 1);

                    const templateRef = doc(db, 'recurring_transactions', docId);
                    batch.update(templateRef, {
                        nextRunDate: Timestamp.fromDate(nextRun)
                    });

                    processedCount++;
                });

                if (processedCount > 0) {
                    await batch.commit();
                    console.log(`Processed ${processedCount} recurring transactions.`);
                }
            } catch (error) {
                console.error("Based recurring processor error:", error);
            }
        };

        // Run once on mount (or when profile loads)
        processRecurring();
    }, [profile?.householdId, profile?.uid]);
}
