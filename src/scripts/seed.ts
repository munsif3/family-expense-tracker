/* eslint-disable */
/**
 * Run this script to seed the database.
 * Usage: npx tsx src/scripts/seed.ts
 * 
 * Prerequisites:
 * 1. Set GOOGLE_APPLICATION_CREDENTIALS to your service account key path
 *    OR log in via `gcloud auth application-default login`
 * 2. Ensure .env.local has FIREBASE_PROJECT_ID
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Admin SDK
// Note: In a real environment, you'd use a service account.
// For local dev with emulators, simple init is enough.
const app = !getApps().length
    ? initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
    })
    : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app);

const SEED_USERS = [
    {
        uid: 'user-husband-1',
        email: 'husband@example.com',
        password: 'password123',
        displayName: 'John Doe',
    },
    {
        uid: 'user-wife-1',
        email: 'wife@example.com',
        password: 'password123',
        displayName: 'Jane Doe',
    },
    {
        uid: 'user-admin-1',
        email: 'admin@example.com',
        password: 'password123',
        displayName: 'Admin User',
        role: 'admin',
    },
];

async function seed() {
    console.log('🌱 Starting seed...');

    // 1. Create Users
    for (const user of SEED_USERS) {
        try {
            await auth.deleteUser(user.uid).catch(() => { }); // Cleanup existing
            await auth.createUser({
                uid: user.uid,
                email: user.email,
                password: user.password,
                displayName: user.displayName,
            });
            console.log(`Created user: ${user.email}`);
        } catch (e) {
            console.warn(`Error creating auth user ${user.email}:`, e);
        }
    }

    // 2. Create Household
    const householdId = 'household-demo-1';
    const householdRef = db.collection('households').doc(householdId);
    await householdRef.set({
        name: 'Doe Family',
        memberIds: ['user-husband-1', 'user-wife-1'],
        currency: 'USD',
        createdAt: Timestamp.now(),
    });
    console.log('Created Household');

    // 3. User Profiles linked to Household
    for (const user of SEED_USERS) {
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: (user as any).role || 'user',
            householdId: user.role === 'admin' ? null : householdId,
            createdAt: Timestamp.now(),
            lastSeen: Timestamp.now(),
        });
    }

    // 4. Categories
    const categories = [
        { id: 'cat-salary', name: 'Salary', type: 'income', color: '#10b981' },
        { id: 'cat-rent', name: 'Rent', type: 'expense', color: '#ef4444' },
        { id: 'cat-food', name: 'Food & Groceries', type: 'expense', color: '#f59e0b' },
        { id: 'cat-invest', name: 'Investments', type: 'expense', color: '#3b82f6' },
    ];

    for (const cat of categories) {
        await db.collection('categories').doc(cat.id).set({
            ...cat,
            householdId,
        });
    }

    // 5. Transactions (Sample)
    const transactions = [
        {
            description: 'Monthly Salary',
            amount: 5000,
            type: 'income',
            categoryId: 'cat-salary',
            userId: 'user-husband-1',
            date: new Date('2024-01-01'),
            isRecurring: true,
        },
        {
            description: 'Rent Payment',
            amount: 1500,
            type: 'expense',
            categoryId: 'cat-rent',
            userId: 'user-husband-1',
            date: new Date('2024-01-02'),
            isRecurring: true,
        },
        {
            description: 'Grocery Run',
            amount: 150.50,
            type: 'expense',
            categoryId: 'cat-food',
            userId: 'user-wife-1',
            date: new Date('2024-01-05'),
        },
    ];

    for (const tx of transactions) {
        await db.collection('transactions').add({
            ...tx,
            householdId,
            date: Timestamp.fromDate(tx.date),
            attachments: [],
        });
    }

    console.log('✅ Seed complete!');
}

seed()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
