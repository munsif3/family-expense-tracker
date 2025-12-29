import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Timestamp } from 'firebase/firestore';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
    if (currency === 'LKR') {
        return `Rs. ${new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)}`;
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Safely converts various date formats (Firestore Timestamp, string, number, Date) 
 * into a standard JavaScript Date object.
 */
export function toJsDate(date: Date | Timestamp | string | number | unknown): Date {
    if (!date) return new Date();

    // Check for Firestore Timestamp-like object (has toDate method)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as any).toDate === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (date as any).toDate();
    }

    if (date instanceof Date) return date;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Date(date as any);
}
