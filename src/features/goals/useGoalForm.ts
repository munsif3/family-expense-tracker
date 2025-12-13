import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FinancialGoal } from '@/types';

const goalSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    targetAmount: z.string().min(1, 'Target amount is required'), // parsed to number on submit
    currentAmount: z.string().optional(),
    color: z.string(),
    deadline: z.date().optional().nullable(),
});

export type GoalFormData = z.infer<typeof goalSchema>;

export const GOAL_COLORS = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
];

export function useGoalForm(
    initialData: FinancialGoal | null | undefined,
    onSave: (data: Omit<FinancialGoal, 'id' | 'userId' | 'householdId'>) => Promise<void>,
    onSuccess: () => void
) {
    const [loading, setLoading] = useState(false);

    const form = useForm<GoalFormData>({
        resolver: zodResolver(goalSchema),
        defaultValues: {
            name: '',
            targetAmount: '',
            currentAmount: '0',
            color: GOAL_COLORS[0].value,
            deadline: undefined,
        },
    });

    // Sync form with initialData when it changes or modal opens
    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                targetAmount: initialData.targetAmount.toString(),
                currentAmount: initialData.currentAmount.toString(),
                color: initialData.color,
                deadline: initialData.deadline,
            });
        } else {
            form.reset({
                name: '',
                targetAmount: '',
                currentAmount: '0',
                color: GOAL_COLORS[0].value,
                deadline: undefined, // Reset to undefined on clear
            });
        }
    }, [initialData, form]);

    const handleSubmit = async (data: GoalFormData) => {
        setLoading(true);
        try {
            await onSave({
                name: data.name,
                targetAmount: parseFloat(data.targetAmount) || 0,
                currentAmount: parseFloat(data.currentAmount || '0') || 0,
                color: data.color,
                deadline: data.deadline || undefined, // undefined is better for optional in Firestore usually, or null
                icon: 'trophy',
            });
            onSuccess();
        } catch (error) {
            console.error("Failed to save goal", error);
        } finally {
            setLoading(false);
        }
    };

    return {
        form,
        loading,
        submitGoal: handleSubmit,
        colors: GOAL_COLORS
    };
}
