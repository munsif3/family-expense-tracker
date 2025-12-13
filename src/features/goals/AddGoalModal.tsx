import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FinancialGoal } from '@/types';
import { DatePickerCalendar } from '@/components/ui/date-picker-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react'; // Added Loader2 import
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGoalForm } from './useGoalForm'; // Import the new hook

interface AddGoalModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: Omit<FinancialGoal, 'id' | 'userId' | 'householdId'>) => Promise<void>;
    initialData?: FinancialGoal | null;
}

export function AddGoalModal({ open, onOpenChange, onSave, initialData }: AddGoalModalProps) {
    const { form, loading, submitGoal, colors } = useGoalForm(
        initialData,
        onSave,
        () => onOpenChange(false)
    );

    const deadline = form.watch('deadline');
    const selectedColor = form.watch('color');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(submitGoal)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Goal Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Dream Vacation"
                            {...form.register('name')}
                        />
                        {form.formState.errors.name && (
                            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="target">Target Amount</Label>
                            <Input
                                id="target"
                                type="number"
                                placeholder="5000"
                                {...form.register('targetAmount')}
                                min="1"
                            />
                            {form.formState.errors.targetAmount && (
                                <p className="text-sm text-destructive">{form.formState.errors.targetAmount.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="current">Current Saved</Label>
                            <Input
                                id="current"
                                type="number"
                                placeholder="0"
                                {...form.register('currentAmount')}
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Target Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !deadline && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <DatePickerCalendar
                                    mode="single"
                                    selected={deadline || undefined}
                                    onSelect={(date) => form.setValue('deadline', date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label>Color Code</Label>
                        <div className="flex gap-2 flex-wrap">
                            {colors.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => form.setValue('color', c.value)}
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all",
                                        selectedColor === c.value ? "border-foreground scale-110" : "border-transparent opacity-70 hover:opacity-100"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Saving...' : (initialData ? 'Update Goal' : 'Save Goal')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
