import { Timestamp, FieldValue } from 'firebase/firestore';

export type Role = 'admin' | 'user';

export * from '../features/trips/types';

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

export type GoalCategory = 'short-term' | 'medium-term' | 'long-term';
export type GoalPriority = 'high' | 'medium' | 'low';
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
export type FeasibilityStatus = 'feasible' | 'conditionally-feasible' | 'not-feasible';

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

    // Planning Fields
    category?: GoalCategory;
    priority?: GoalPriority;
    monthlyContribution?: number;
    inflationRate?: number;
    fundingSourceIds?: string[];
    riskLevel?: RiskTolerance;

    // Feasibility Output
    feasibilityStatus?: FeasibilityStatus;
    feasibilityNote?: string;
}

export interface FinancialProfile {
    householdId: string;
    currency: string;
    riskAllocation: {
        conservative: number; // % (0-100)
        moderate: number;
        aggressive: number;
    };
    savingsCapacity: { userId: string; amount: number }[];
    totalMonthlyIncome: number;
    monthlyCommitments: number;
    variableCommitments: number;
    incomeGrowthRate?: number; // Annual %
    annualBonus?: number; // Annual 1-time amount
    income: {
        userId: string;
        grossMonthly: number;
        netMonthly: number;
    }[];
    lastUpdated: Timestamp;
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

export interface PaymentMethod {
    id: string;
    householdId: string;
    name: string;
    type: 'credit_card' | 'debit_card' | 'cash' | 'bank_transfer' | 'other';
    isCommon: boolean;
    ownerId?: string; // If personal, who owns it?
    last4digits?: string;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta: Record<string, any>; // Flexible for different asset types (gold weight, karat, etc)
    source?: string;
    ownerIds?: string[]; // Multiple owners support
}
