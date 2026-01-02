'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Controller } from 'react-hook-form';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { tripService } from '@/lib/api/trips';
import { Trip } from '../types';
import { toJsDate } from '@/lib/utils';

const tripSchema = z.object({
    tripName: z.string().min(3, "Trip name is required"),
    location: z.string().min(2, "Location is required"),
    tripType: z.enum(['local', 'international']),
    startDate: z.date(),
    endDate: z.date(),
    participantIds: z.array(z.string()),
}).refine((data) => data.startDate <= data.endDate, {
    message: "End date must be after start date",
    path: ["endDate"],
});

type TripFormData = z.infer<typeof tripSchema>;

interface EditTripModalProps {
    trip: Trip;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditTripModal({ trip, open, onOpenChange }: EditTripModalProps) {
    const { profile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [members, setMembers] = useState<UserProfile[]>([]);

    // Fetch household members
    useEffect(() => {
        const fetchMembers = async () => {
            if (profile?.householdId) {
                try {
                    const q = query(
                        collection(db, 'users'),
                        where('householdId', '==', profile.householdId)
                    );
                    const snapshot = await getDocs(q);
                    setMembers(snapshot.docs.map(d => d.data() as UserProfile));
                } catch (e) { console.error(e); }
            }
        };
        fetchMembers();
    }, [profile?.householdId]);

    const { register, handleSubmit, formState: { errors }, reset, control, setValue, watch, getValues } = useForm<TripFormData>({
        resolver: zodResolver(tripSchema),
        defaultValues: {
            tripName: trip.tripName,
            location: trip.location,
            tripType: trip.tripType,
            startDate: toJsDate(trip.startDate),
            endDate: toJsDate(trip.endDate),
            participantIds: trip.participantIds || []
        }
    });

    // Reset form when trip changes
    useEffect(() => {
        if (open) {
            reset({
                tripName: trip.tripName,
                location: trip.location,
                tripType: trip.tripType,
                startDate: toJsDate(trip.startDate),
                endDate: toJsDate(trip.endDate),
                participantIds: trip.participantIds || []
            });
        }
    }, [trip, open, reset]);

    const selectedParticipants = watch('participantIds');

    const toggleParticipant = (uid: string) => {
        const current = getValues('participantIds') || [];
        if (current.includes(uid)) {
            setValue('participantIds', current.filter(id => id !== uid));
        } else {
            setValue('participantIds', [...current, uid]);
        }
    };

    const toggleAll = () => {
        if (selectedParticipants.length === members.length) {
            setValue('participantIds', []);
        } else {
            setValue('participantIds', members.map(m => m.uid));
        }
    };

    const onSubmit = async (data: TripFormData) => {
        setIsSubmitting(true);
        try {
            await tripService.updateTrip(trip.id, {
                tripName: data.tripName,
                location: data.location,
                tripType: data.tripType,
                startDate: Timestamp.fromDate(data.startDate),
                endDate: Timestamp.fromDate(data.endDate),
                participantIds: data.participantIds,
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update trip", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Trip</DialogTitle>
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
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Select onValueChange={(val) => setValue('tripType', val as any)} defaultValue={trip.tripType}>
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
                        <div className="space-y-2 flex flex-col">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Controller
                                control={control}
                                name="startDate"
                                render={({ field }) => (
                                    <DatePicker date={field.value} setDate={field.onChange} />
                                )}
                            />
                            {errors.startDate && <p className="text-red-500 text-xs">{errors.startDate.message}</p>}
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <Label htmlFor="endDate">End Date</Label>
                            <Controller
                                control={control}
                                name="endDate"
                                render={({ field }) => (
                                    <DatePicker date={field.value} setDate={field.onChange} />
                                )}
                            />
                            {errors.endDate && <p className="text-red-500 text-xs">{errors.endDate.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Participants</Label>
                        <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                            <div className="flex items-center space-x-2 pb-2 border-b">
                                <Checkbox
                                    id="all-participants"
                                    checked={members.length > 0 && selectedParticipants.length === members.length}
                                    onCheckedChange={toggleAll}
                                />
                                <Label htmlFor="all-participants" className="font-bold cursor-pointer">Select All Household Members</Label>
                            </div>
                            {members.map(member => (
                                <div key={member.uid} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`participant-${member.uid}`}
                                        checked={(selectedParticipants || []).includes(member.uid)}
                                        onCheckedChange={() => toggleParticipant(member.uid)}
                                    />
                                    <Label htmlFor={`participant-${member.uid}`} className="font-normal cursor-pointer">
                                        {member.displayName || member.email}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">The trip will be visible to selected members.</p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
