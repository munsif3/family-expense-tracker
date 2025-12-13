import { Timestamp } from 'firebase/firestore';

/**
 * safely converts various date formats (Firestore Timestamp, string, number, Date) 
 * into a standard JavaScript Date object.
 */
export function toJsDate(date: Date | Timestamp | string | number | any): Date {
    if (!date) return new Date();

    // Check for Firestore Timestamp-like object (has toDate method)
    if (typeof date === 'object' && typeof date.toDate === 'function') {
        return date.toDate();
    }

    if (date instanceof Date) return date;

    return new Date(date);
}
