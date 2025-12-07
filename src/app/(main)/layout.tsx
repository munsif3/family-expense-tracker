'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Check if user has a household
    if (!loading && profile && !profile.householdId) {
        return <OnboardingFlow />;
    }

    return (
        <div className="flex min-h-screen bg-muted/20">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto h-screen">
                {children}
            </main>
        </div>
    );
}
