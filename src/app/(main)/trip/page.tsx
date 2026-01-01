import { Suspense } from 'react';
import { TripDetailWrapper } from './TripDetailWrapper';

export default function TripPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading trip details...</div>}>
            <TripDetailWrapper />
        </Suspense>
    );
}
