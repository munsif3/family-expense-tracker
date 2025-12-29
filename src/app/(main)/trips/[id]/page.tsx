import { TripDetailWrapper } from './TripDetailWrapper';

export const dynamicParams = false;

export async function generateStaticParams() {
    return [{ id: 'test' }];
}

export default function TripDetailPage() {
    return <TripDetailWrapper />;
}
