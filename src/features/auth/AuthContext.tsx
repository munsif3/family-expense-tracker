'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { UserProfile, Household } from '@/types';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    household: Household | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    household: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [household, setHousehold] = useState<Household | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let profileUnsubscribe: (() => void) | null = null;
        let householdUnsubscribe: (() => void) | null = null;

        const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            // Clean up previous listeners to avoid memory leaks or state inconsistency
            // when switching users.
            if (profileUnsubscribe) { profileUnsubscribe(); profileUnsubscribe = null; }
            if (householdUnsubscribe) { householdUnsubscribe(); householdUnsubscribe = null; }

            if (firebaseUser) {
                const userRef = doc(db, 'users', firebaseUser.uid);

                // CHAINED DATA LOADING PATTERN:
                // 1. Auth State (User) -> 2. User Profile (Firestore) -> 3. Household Data (Firestore)

                // Set up real-time listener for profile
                profileUnsubscribe = onSnapshot(userRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        const userProfile = docSnap.data() as UserProfile;
                        setProfile(userProfile);

                        // If user has a householdId, subscribe to it
                        if (userProfile.householdId) {
                            // If we are already listening to THIS household, don't re-sub
                            if (householdUnsubscribe) householdUnsubscribe();

                            householdUnsubscribe = onSnapshot(doc(db, 'households', userProfile.householdId), (hhSnap) => {
                                if (hhSnap.exists()) {
                                    setHousehold({ id: hhSnap.id, ...hhSnap.data() } as Household);
                                } else {
                                    setHousehold(null);
                                }
                            });
                        } else {
                            // User left household or has none
                            setHousehold(null);
                            if (householdUnsubscribe) { householdUnsubscribe(); householdUnsubscribe = null; }
                        }

                    } else {
                        // Create new user profile if not exists
                        const newProfile: UserProfile = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            role: 'user',
                            householdId: null,
                            createdAt: serverTimestamp() as any,
                            lastSeen: serverTimestamp() as any,
                        };
                        try {
                            await setDoc(userRef, newProfile);
                            setProfile(newProfile);
                        } catch (e) {
                            console.error("Error creating profile:", e);
                        }
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Profile snapshot error:", error);
                    setLoading(false);
                });

            } else {
                setProfile(null);
                setHousehold(null);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
            if (householdUnsubscribe) householdUnsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, household, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
