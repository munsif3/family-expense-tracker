import { FinancialGoal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Trophy, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { differenceInDays } from 'date-fns';

interface GoalCardProps {
    goal: FinancialGoal;
    currency: string;
    onEdit: (goal: FinancialGoal) => void;
    onDelete: (goal: FinancialGoal) => void;
}

export function GoalCard({ goal, currency, onEdit, onDelete }: GoalCardProps) {
    const percent = Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100));
    const daysLeft = goal.deadline ? differenceInDays(goal.deadline, new Date()) : null;

    return (
        <Card className="hover:shadow-lg transition-shadow duration-200 overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: goal.color }} />
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-accent/10 text-accent-foreground">
                        <Trophy className="h-5 w-5" style={{ color: goal.color }} />
                    </div>
                    <CardTitle className="text-lg font-semibold">{goal.name}</CardTitle>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(goal)} className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(goal)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-3xl font-bold tracking-tight">
                                {formatCurrency(goal.currentAmount, currency)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                of {formatCurrency(goal.targetAmount, currency)} goal
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-xl font-bold text-primary">{Math.round(percent)}%</span>
                        </div>
                    </div>

                    <Progress value={percent} className="h-3" indicatorColor={goal.color} />

                    {daysLeft !== null && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 p-2 rounded-md">
                            <AlertCircle className="h-3 w-3" />
                            {daysLeft > 0 ? (
                                <span>{daysLeft} days remaining</span>
                            ) : (
                                <span className="text-destructive font-medium">Goal deadline passed</span>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
