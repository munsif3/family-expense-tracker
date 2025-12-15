import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createSecureQuery } from '@/lib/firestoreUtils';
import { toJsDate } from '@/lib/utils';
import { Transaction } from '@/types';
import { startOfMonth, endOfMonth, isSameDay } from 'date-fns';

export interface DailyData {
    date: Date;
    income: number;
    expense: number;
    transactions: Transaction[];
}

export function useCalendarData(currentMonth: Date) {
    const { profile } = useAuth();
    const [dailyMap, setDailyMap] = useState<Record<string, DailyData>>({});
    const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.householdId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const start = startOfMonth(currentMonth);
                const end = endOfMonth(currentMonth);

                const q = createSecureQuery({
                    collectionName: 'transactions',
                    householdId: profile.householdId || undefined,
                    userId: profile.uid || undefined,
                    constraints: [
                        where('date', '>=', Timestamp.fromDate(start)),
                        where('date', '<=', Timestamp.fromDate(end)),
                        orderBy('date', 'desc')
                    ]
                });

                const snapshot = await getDocs(q);
                const transactions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Safety check for date types
                })) as Transaction[];

                const map: Record<string, DailyData> = {};
                let totalIncome = 0;
                let totalExpense = 0;

                transactions.forEach(t => {
                    // Convert Timestamp to Date
                    const date = toJsDate(t.date);
                    const dateKey = date.toDateString();

                    if (!map[dateKey]) {
                        map[dateKey] = {
                            date: date,
                            income: 0,
                            expense: 0,
                            transactions: []
                        };
                    }

                    if (t.type === 'income') {
                        map[dateKey].income += t.amount;
                        totalIncome += t.amount;
                    } else {
                        map[dateKey].expense += t.amount;
                        totalExpense += t.amount;
                    }

                    map[dateKey].transactions.push({ ...t, date: date as any });
                });

                setDailyMap(map);
                setMonthlyStats({ income: totalIncome, expense: totalExpense });

            } catch (error) {
                console.error("Error fetching calendar data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile?.householdId, currentMonth]); // Re-fetch when month changes

    return { dailyMap, monthlyStats, loading };
}
