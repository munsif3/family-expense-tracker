'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';
import { useRecurringProcessor } from '@/features/recurring/useRecurringProcessor';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    // Background process to check/run recurring transactions
    useRecurringProcessor();

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
        <div className="flex min-h-screen bg-muted/20 flex-col lg:flex-row">
            {/* Mobile Header (Visible on small screens) */}
            <MobileHeader />

            {/* Desktop Sidebar (Hidden on small screens) */}
            <div className="hidden lg:block w-64 border-r bg-background h-screen sticky top-0">
                <Sidebar />
            </div>

            <main className="flex-1 p-4 lg:p-8 overflow-y-auto h-[calc(100vh-65px)] lg:h-screen">
                {children}
            </main>
        </div>
    );
}
