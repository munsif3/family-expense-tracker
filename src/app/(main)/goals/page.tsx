'use client';

import { useGoals } from '@/features/goals/useGoals';
import { useAuth } from '@/features/auth/AuthContext';
import { useFinancialProfile } from '@/features/planning/useFinancialProfile';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { GoalCard } from '@/features/goals/GoalCard';
import { AddGoalModal } from '@/features/goals/AddGoalModal';
import { useState } from 'react';
import { FinancialGoal } from '@/types';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialProfileForm } from '@/features/planning/components/FinancialProfileForm';
import { FeasibilityView } from '@/features/planning/components/FeasibilityView';
import { useSavings } from '@/features/savings/useSavings';

export default function GoalsPage() {
    const { goals, loading: goalsLoading, addGoal, updateGoal, deleteGoal } = useGoals();
    const { household, profile: userProfile } = useAuth();
    const { profile, loading: profileLoading, updateProfile } = useFinancialProfile(userProfile?.householdId || undefined);
    const { assets } = useSavings();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const currency = household?.currency || 'USD';
    const loading = goalsLoading || profileLoading;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSaveGoal = async (data: any) => {
        try {
            if (editingGoal) {
                await updateGoal(editingGoal.id, data);
                toast.success("Goal updated", { description: "Your financial goal has been updated." });
                setEditingGoal(null);
            } else {
                await addGoal(data);
                toast.success("Goal created", { description: "New financial goal added successfully." });
            }
        } catch {
            toast.error("Error", { description: "Failed to save goal." });
        }
    };

    const handleDeleteGoal = async (goal: FinancialGoal) => {
        if (confirm(`Are you sure you want to delete the goal "${goal.name}"?`)) {
            await deleteGoal(goal.id);
            toast.success("Goal deleted");
        }
    };

    const handleEditGoal = (goal: FinancialGoal) => {
        setEditingGoal(goal);
        setIsAddOpen(true);
    };

    const handleOpenChange = (open: boolean) => {
        setIsAddOpen(open);
        if (!open) setEditingGoal(null);
    };

    if (loading) {
        // ... (skeleton remains same)
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
            {/* Header ... */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Financial Goals</h1>
                    <p className="text-muted-foreground">Define your targets and check their feasibility.</p>
                </div>
            </div>

            <Tabs defaultValue="list" className="space-y-6">
                {/* Tabs List ... */}
                <div className="flex justify-between items-center">
                    <TabsList>
                        <TabsTrigger value="list">My Goals</TabsTrigger>
                        <TabsTrigger value="planning">Feasibility & Strategy</TabsTrigger>
                    </TabsList>

                    <Button onClick={() => setIsAddOpen(true)} className="hidden md:flex">
                        <Plus className="mr-2 h-4 w-4" /> Add Goal
                    </Button>
                </div>

                <TabsContent value="list" className="space-y-6">
                    {/* ... mobile button ... */}
                    <div className="md:hidden">
                        <Button onClick={() => setIsAddOpen(true)} className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> Add Goal
                        </Button>
                    </div>

                    {goals.length === 0 ? (
                        // ... empty state ...
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
                                    onEdit={handleEditGoal}
                                    onDelete={handleDeleteGoal}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="planning" className="space-y-6">
                    {!profile ? (
                        <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 shadow-sm">
                            <h2 className="mb-6 text-center text-2xl font-bold">Unlocking Financial Planning</h2>
                            <p className="mb-8 text-center text-muted-foreground">
                                To help you plan your goals realistically, we need to understand your household&apos;s financial capacity.
                            </p>
                            <FinancialProfileForm
                                currentProfile={null}
                                onSave={updateProfile}
                                onCancel={() => { }}
                            />
                        </div>
                    ) : isEditingProfile ? (
                        <div className="mx-auto max-w-2xl">
                            <Button
                                variant="ghost"
                                onClick={() => setIsEditingProfile(false)}
                                className="mb-4"
                            >
                                ← Back to Analysis
                            </Button>
                            <FinancialProfileForm
                                currentProfile={profile}
                                onSave={async (data) => {
                                    await updateProfile(data);
                                    setIsEditingProfile(false);
                                }}
                                onCancel={() => setIsEditingProfile(false)}
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditingProfile(true)}
                                >
                                    Edit Financial Profile
                                </Button>
                            </div>
                            <FeasibilityView goals={goals} profile={profile} assets={assets} />
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <AddGoalModal
                open={isAddOpen}
                onOpenChange={handleOpenChange}
                onSave={handleSaveGoal}
                initialData={editingGoal}
                assets={assets}
            />
        </div>
    );
}
