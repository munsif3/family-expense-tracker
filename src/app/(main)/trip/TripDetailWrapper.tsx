'use client';

import { useSearchParams } from 'next/navigation';
import { TripDetail } from '@/features/trips/components/TripDetail';

export function TripDetailWrapper() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    if (!id) return null;

    return <TripDetail id={id} />;
}
