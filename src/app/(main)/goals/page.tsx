'use client';

import { useGoals } from '@/features/goals/useGoals';
import { useAuth } from '@/features/auth/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { GoalCard } from '@/features/goals/GoalCard';
import { AddGoalModal } from '@/features/goals/AddGoalModal';
import { useState } from 'react';
import { FinancialGoal } from '@/types';
import { toast } from 'sonner';

export default function GoalsPage() {
    const { goals, loading, addGoal, updateGoal, deleteGoal } = useGoals();
    const { household } = useAuth();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
    // const { toast } = useToast(); -> Removed

    const currency = household?.currency || 'USD';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSave = async (data: any) => {
        try {
            if (editingGoal) {
                await updateGoal(editingGoal.id, data);
                toast.success("Goal updated", { description: "Your financial goal has been updated." });
                setEditingGoal(null);
            } else {
                await addGoal(data);
                toast.success("Goal created", { description: "New financial goal added successfully." });
            }
        } catch (error) {
            toast.error("Error", { description: "Failed to save goal." });
        }
    };

    const handleDelete = async (goal: FinancialGoal) => {
        if (confirm(`Are you sure you want to delete the goal "${goal.name}"?`)) {
            await deleteGoal(goal.id);
            toast.success("Goal deleted");
        }
    };

    const handleEdit = (goal: FinancialGoal) => {
        setEditingGoal(goal);
        setIsAddOpen(true);
    };

    const handleOpenChange = (open: boolean) => {
        setIsAddOpen(open);
        if (!open) setEditingGoal(null);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Financial Goals</h1>
                    <p className="text-muted-foreground">Track your savings targets and visualize your progress.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Goal
                </Button>
            </div>

            {goals.length === 0 ? (
                <Card className="border-dashed">
                    <CardHeader className="text-center pb-10 pt-10">
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Plus className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>No goals yet</CardTitle>
                        <CardDescription className="max-w-sm mx-auto mt-2">
                            Create your first financial goal to start tracking progress towards your dreams.
                        </CardDescription>
                        <Button onClick={() => setIsAddOpen(true)} className="mt-6 mx-auto">
                            Create Goal
                        </Button>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {goals.map(goal => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            currency={currency}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            <AddGoalModal
                open={isAddOpen}
                onOpenChange={handleOpenChange}
                onSave={handleSave}
                initialData={editingGoal}
            />
        </div>
    );
}
