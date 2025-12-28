'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTrips } from '../hooks/useTrips';

const tripSchema = z.object({
    tripName: z.string().min(3, "Trip name is required"),
    location: z.string().min(2, "Location is required"),
    tripType: z.enum(['local', 'international']),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "End date must be after start date",
    path: ["endDate"],
});

type TripFormData = z.infer<typeof tripSchema>;

interface AddTripModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddTripModal({ open, onOpenChange }: AddTripModalProps) {
    const { createTrip } = useTrips();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<TripFormData>({
        resolver: zodResolver(tripSchema),
        defaultValues: {
            tripType: 'international'
        }
    });

    const onSubmit = async (data: TripFormData) => {
        setIsSubmitting(true);
        try {
            await createTrip({
                tripName: data.tripName,
                location: data.location,
                tripType: data.tripType,
                startDate: Timestamp.fromDate(new Date(data.startDate)),
                endDate: Timestamp.fromDate(new Date(data.endDate)),
                accommodations: [],
                usedCurrencies: ['USD'], // Default, user can change later
                participantIds: [], // Defaults to creator in hook
            });
            reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to create trip", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Trip</DialogTitle>
                    <DialogDescription>
                        Add a new trip to track expenses.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="tripName">Trip Name</Label>
                        <Input id="tripName" placeholder="e.g. Dubai 2025" {...register("tripName")} />
                        {errors.tripName && <p className="text-red-500 text-xs">{errors.tripName.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" placeholder="City or Country" {...register("location")} />
                        {errors.location && <p className="text-red-500 text-xs">{errors.location.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tripType">Trip Type</Label>
                        <Select onValueChange={(val) => reset(values => ({ ...values, tripType: val as any }))} defaultValue="international">
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="international">International</SelectItem>
                                <SelectItem value="local">Local</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input id="startDate" type="date" {...register("startDate")} />
                            {errors.startDate && <p className="text-red-500 text-xs">{errors.startDate.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input id="endDate" type="date" {...register("endDate")} />
                            {errors.endDate && <p className="text-red-500 text-xs">{errors.endDate.message}</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Trip"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
