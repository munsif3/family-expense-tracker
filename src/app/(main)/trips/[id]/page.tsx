import { TripDetail } from '@/features/trips/components/TripDetail';

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TripDetail id={id} />;
}
