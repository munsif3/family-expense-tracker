'use client';

import { useParams } from 'next/navigation';
import { TripDetail } from '@/features/trips/components/TripDetail';

export function TripDetailWrapper() {
    const params = useParams();
    const id = params?.id as string;

    if (!id) return null;

    return <TripDetail id={id} />;
}
