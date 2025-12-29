import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FinancialGoal } from '@/types';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGoalForm } from './useGoalForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Asset } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';

interface AddGoalModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: Omit<FinancialGoal, 'id' | 'userId' | 'householdId'>) => Promise<void>;
    initialData?: FinancialGoal | null;
    assets?: Asset[];
}

export function AddGoalModal({ open, onOpenChange, onSave, initialData, assets }: AddGoalModalProps) {
    const { form, loading, submitGoal, colors } = useGoalForm(
        initialData,
        onSave,
        () => onOpenChange(false)
    );

    const deadline = form.watch('deadline');
    const selectedColor = form.watch('color');
    const linkedIds = form.watch('fundingSourceIds') || [];

    const toggleAsset = (assetId: string) => {
        const current = form.getValues('fundingSourceIds') || [];
        if (current.includes(assetId)) {
            form.setValue('fundingSourceIds', current.filter(id => id !== assetId));
        } else {
            form.setValue('fundingSourceIds', [...current, assetId]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
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
                            <Label htmlFor="current">Current Saved (Cash)</Label>
                            <Input
                                id="current"
                                type="number"
                                placeholder="0"
                                {...form.register('currentAmount')}
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Link Assets Section */}
                    {assets && assets.length > 0 && (
                        <div className="space-y-2">
                            <Label>Link Existing Investments</Label>
                            <div className="rounded-md border p-4 max-h-40 overflow-y-auto space-y-3">
                                {assets.map(asset => (
                                    <div key={asset.id} className="flex items-start space-x-3">
                                        <Checkbox
                                            id={`asset-${asset.id}`}
                                            checked={linkedIds.includes(asset.id)}
                                            onCheckedChange={() => toggleAsset(asset.id)}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label
                                                htmlFor={`asset-${asset.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {asset.name}
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Values: {asset.currentValue?.toLocaleString() ?? asset.amountInvested.toLocaleString()} ({asset.type})
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Selected investments will count towards your current progress.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                                onValueChange={(val) => form.setValue('category', val as "short-term" | "medium-term" | "long-term")}
                                defaultValue={form.getValues('category')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="short-term">Short Term (≤ 2y)</SelectItem>
                                    <SelectItem value="medium-term">Medium Term (2-5y)</SelectItem>
                                    <SelectItem value="long-term">Long Term (5y+)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                                onValueChange={(val) => form.setValue('priority', val as "high" | "medium" | "low")}
                                defaultValue={form.getValues('priority')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Target Date</Label>
                        <Input
                            type="date"
                            value={deadline ? format(deadline, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                                // Native property returns Date object
                                // Adjust for timezone if needed, usually valueAsDate is UTC, value is string YYYY-MM-DD
                                // Better to use value string to avoid timezone shifts on simple dates
                                const dateStr = e.target.value;
                                if (dateStr) {
                                    form.setValue('deadline', new Date(dateStr));
                                } else {
                                    form.setValue('deadline', undefined);
                                }
                            }}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contribution">Planned Monthly Contribution (Optional)</Label>
                        <Input
                            id="contribution"
                            type="number"
                            placeholder="0"
                            {...form.register('monthlyContribution')}
                            min="0"
                        />
                        <p className="text-xs text-muted-foreground">Or let the planning engine suggest one.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Preferred Strategy (Risk Level)</Label>
                        <Select
                            onValueChange={(val) => form.setValue('riskLevel', val as "conservative" | "moderate" | "aggressive")}
                            defaultValue={form.getValues('riskLevel') || undefined}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Auto (Best Fit)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="conservative">Conservative (Low Risk)</SelectItem>
                                <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
                                <SelectItem value="aggressive">Aggressive (High Growth)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Manually override the recommended strategy.
                        </p>
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
