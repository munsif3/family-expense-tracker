import { Timestamp, FieldValue } from 'firebase/firestore';

export type Role = 'admin' | 'user';

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: Role;
    householdId: string | null;
    createdAt: Timestamp | FieldValue;
    lastSeen: Timestamp | FieldValue;
}

// ...

export interface FinancialGoal {
    id: string;
    userId: string;
    householdId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: Date;
    color: string;
    icon: string;
    createdAt?: Timestamp | FieldValue;
}

export interface Household {
    id: string;
    name: string;
    memberIds: string[];
    currency: string;
    createdAt: Timestamp;
    // Encrypted symmetric key (AES-GCM) for the household, keyed by user ID
    // Each user has a copy of the key encrypted with their own KEK (derived from password or auth)
    encryptedKeys?: Record<string, string>;
    name_lower?: string; // Normalized name for case-insensitive search
}

export interface Transaction {
    id: string;
    householdId: string;
    userId: string;
    type: 'income' | 'expense';
    amount: number;
    currency: string;
    categoryId: string;
    categoryName?: string; // Denormalized for easier display
    date: Timestamp;
    description: string;
    paymentMethodId?: string;
    isRecurring: boolean;
    recurrenceRule?: string;
    attachments: Attachment[];
    spentBy?: string; // userId of the person who spent the money
    isPersonal?: boolean; // If true, this transaction is only for the spender
}

export interface RecurringTransaction {
    id: string;
    householdId: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    categoryId: string;
    interval: 'weekly' | 'monthly' | 'yearly';
    nextRunDate: Timestamp;
    active: boolean;
    createdAt: Timestamp;
}



export interface Attachment {
    id: string;
    url: string;
    mimeType: string;
    name: string;
    isEncrypted: boolean;
}

export interface Category {
    id: string;
    householdId: string;
    name: string;
    type: 'income' | 'expense';
    color: string;
    budgetMonthly?: number;
    budgets?: Record<string, number>; // { "2025": monthlyAmount }
    userBudgets?: Record<string, number>; // { userId: monthlyAmount }
}

export interface Asset {
    id: string;
    householdId: string;
    ownerUserId: string;
    type: 'Gold' | 'FD' | 'MonthlySaving' | 'Property' | 'Stock' | 'Crypto' | 'Jewellery' | 'Bank';
    name: string;
    amountInvested: number;
    currentValue?: number;
    currency: string;
    buyDate: Timestamp;
    notes?: string;
    isEncrypted: boolean; // If true, sensitive fields like photos/notes are client-side encrypted
    attachments: Attachment[];
    meta: Record<string, any>; // Flexible for different asset types (gold weight, karat, etc)
    source?: string;
    ownerIds?: string[]; // Multiple owners support
}
