'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTrips } from '../hooks/useTrips';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, MapPin, Calendar } from 'lucide-react';
import { AddTripModal } from './AddTripModal';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function TripsList() {
    const { trips, loading, error } = useTrips();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    const handleTripClick = (id: string) => {
        router.push(`/trip?id=${id}`);
    };

    if (loading) return <LoadingSpinner size="lg" className="py-12" text="Loading trips..." />;
    if (error) return <div className="p-4 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trips</h1>
                    <p className="text-muted-foreground">Manage your travel expenses and participants.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Trip
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trips.map((trip) => (
                    <Card
                        key={trip.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleTripClick(trip.id)}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-xl">{trip.tripName}</CardTitle>
                                <div className={`px-2 py-1 rounded text-xs font-medium ${trip.tripType === 'international' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                    {trip.tripType === 'international' ? 'Intl' : 'Local'}
                                </div>
                            </div>
                            <CardDescription className="flex items-center mt-1">
                                <MapPin className="h-3 w-3 mr-1" /> {trip.location}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                                <Calendar className="h-3 w-3 mr-1" />
                                {trip.startDate && format(trip.startDate.toDate(), 'MMM d, yyyy')}
                                {trip.endDate && ` - ${format(trip.endDate.toDate(), 'MMM d, yyyy')}`}
                            </div>
                            {/* Future: Add total spent summary here if available */}
                        </CardContent>
                    </Card>
                ))}

                {trips.length === 0 && (
                    <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
                        <h3 className="text-lg font-medium">No trips found</h3>
                        <p className="text-muted-foreground mb-4">Start by creating your first trip.</p>
                        <Button variant="outline" onClick={() => setIsModalOpen(true)}>Create Trip</Button>
                    </div>
                )}
            </div>

            <AddTripModal open={isModalOpen} onOpenChange={setIsModalOpen} />
        </div>
    );
}
