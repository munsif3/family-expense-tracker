import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Household } from '@/types';
import { householdService } from '@/lib/api/households';

export function useOnboarding() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingHousehold, setExistingHousehold] = useState<Household | null>(null);

    const checkAndProceed = async (name: string, currency: string) => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const found = await householdService.checkAvailability(name);
            if (found) {
                setExistingHousehold(found);
            } else {
                await createHousehold(name, currency);
            }
        } catch (err: unknown) {
            console.error("Error checking household:", err);
            setError("Error checking availability: " + (err as { message?: string }).message);
        } finally {
            setLoading(false);
        }
    };

    const createHousehold = async (name: string, currency: string) => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            await householdService.createHousehold({ name, currency }, user);
            // Success - AuthContext will pick up the change
        } catch (err: unknown) {
            console.error("Error creating household:", err);
            setError("Failed to create household: " + (err as { message?: string }).message);
        } finally {
            setLoading(false);
        }
    };

    const joinHousehold = async () => {
        if (!user || !existingHousehold) return;
        setLoading(true);
        setError(null);

        try {
            await householdService.joinHousehold(existingHousehold.id, user);
            // Success - AuthContext will pick up change
        } catch (err: unknown) {
            console.error("Error joining household:", err);
            setError("Failed to join household: " + (err as { message?: string }).message);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setExistingHousehold(null);
        setError(null);
    };

    return {
        loading,
        error,
        existingHousehold,
        checkAndProceed,
        joinHousehold,
        reset
    };
}
