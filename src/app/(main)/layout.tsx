'use client';

import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
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
        return <LoadingSpinner fullScreen text="Initializing..." />;
    }

    // Check if user has a household
    if (!loading && profile && !profile.householdId) {
        return <OnboardingFlow />;
    }

    return (
        <div className="fixed inset-0 flex overflow-hidden bg-muted/20 flex-col lg:flex-row">
            {/* Mobile Header (Visible on small screens) */}
            <MobileHeader />

            {/* Desktop Sidebar (Hidden on small screens) */}
            <aside className="hidden lg:block w-64 border-r bg-background h-full">
                <Sidebar />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                {children}
            </main>
        </div>
    );
}
