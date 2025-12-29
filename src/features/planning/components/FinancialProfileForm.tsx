'use client';

import React, { useState, useEffect } from 'react';
import { FinancialProfile } from '@/types';
import { useAuth } from '@/features/auth/AuthContext';
import { Info, PieChart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Props {
    currentProfile: FinancialProfile | null;
    onSave: (data: Partial<FinancialProfile>) => Promise<void>;
    onCancel: () => void;
}

export const FinancialProfileForm: React.FC<Props> = ({ currentProfile, onSave, onCancel }) => {
    const { profile: userProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form State
    const [totalIncome, setTotalIncome] = useState(currentProfile?.totalMonthlyIncome || 0);
    const [fixedCommitments, setFixedCommitments] = useState(currentProfile?.monthlyCommitments || 0);
    const [variableCommitments, setVariableCommitments] = useState(currentProfile?.variableCommitments || 0);
    const [savingsCapacity, setSavingsCapacity] = useState(
        currentProfile?.savingsCapacity?.reduce((sum, s) => sum + s.amount, 0) || 0
    );
    const [growthRate, setGrowthRate] = useState(currentProfile?.incomeGrowthRate || 0);
    const [bonus, setBonus] = useState(currentProfile?.annualBonus || 0);

    // Risk Allocation State
    const [allocation, setAllocation] = useState<{ conservative: number, moderate: number, aggressive: number }>(
        currentProfile?.riskAllocation || { conservative: 50, moderate: 30, aggressive: 20 }
    );

    // Auto-update savings capacity
    useEffect(() => {
        if (!currentProfile) {
            const calculated = Math.max(0, totalIncome - fixedCommitments - variableCommitments);
            setSavingsCapacity(calculated);
        }
    }, [totalIncome, fixedCommitments, variableCommitments, currentProfile]);

    const handleAllocationChange = (type: keyof typeof allocation, value: string) => {
        const val = Math.max(0, Math.min(100, Number(value) || 0));
        setAllocation(prev => ({
            ...prev,
            [type]: val
        }));
    };

    const totalAllocation = allocation.conservative + allocation.moderate + allocation.aggressive;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (totalAllocation !== 100) {
            // Validate via UI feedback preferably, but prevent submit
            return;
        }

        setLoading(true);
        try {
            await onSave({
                riskAllocation: allocation,
                totalMonthlyIncome: totalIncome,
                monthlyCommitments: fixedCommitments,
                variableCommitments: variableCommitments,
                savingsCapacity: [{ userId: userProfile?.uid || 'default', amount: savingsCapacity }],
                income: [{ userId: userProfile?.uid || 'default', grossMonthly: totalIncome, netMonthly: totalIncome }],
                incomeGrowthRate: growthRate,
                annualBonus: bonus
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-card p-6 border shadow-sm">
            <h3 className="text-xl font-semibold">Household Financial Profile</h3>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Monthly Net Income</label>
                    <Input
                        type="number"
                        value={totalIncome}
                        onChange={(e) => setTotalIncome(Number(e.target.value))}
                        placeholder="0.00"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Fixed Monthly Commitments</label>
                    <Input
                        type="number"
                        value={fixedCommitments}
                        onChange={(e) => setFixedCommitments(Number(e.target.value))}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Variable/Lifestyle Commitments</label>
                    <Input
                        type="number"
                        value={variableCommitments}
                        onChange={(e) => setVariableCommitments(Number(e.target.value))}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Annual Income Growth (%)</label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            value={growthRate}
                            onChange={(e) => setGrowthRate(Number(e.target.value))}
                            placeholder="e.g. 5"
                            min="0"
                        />
                        <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Expected Annual Bonus</label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            value={bonus}
                            onChange={(e) => setBonus(Number(e.target.value))}
                            placeholder="e.g. 500000"
                            min="0"
                        />
                        <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Target Monthly Savings</label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            value={savingsCapacity}
                            onChange={(e) => setSavingsCapacity(Number(e.target.value))}
                            className="bg-accent/20 font-bold"
                            placeholder="0.00"
                        />
                        <span className="text-xs text-muted-foreground">
                            (Calc: {Math.max(0, totalIncome - fixedCommitments - variableCommitments).toFixed(0)})
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2">
                        <PieChart className="h-4 w-4" /> Risk Allocation Strategy
                    </h4>
                    <span className={`text-sm font-bold ${totalAllocation === 100 ? 'text-green-600' : 'text-red-600'}`}>
                        Total: {totalAllocation}%
                    </span>
                </div>
                <p className="text-sm text-muted-foreground">
                    Define how you want to split your monthly savings across different risk buckets.
                </p>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 rounded-md border p-3 border-l-4 border-l-green-500 bg-green-50/50">
                        <label className="text-sm font-medium text-green-900">Conservative (%)</label>
                        <p className="text-xs text-muted-foreground mb-2">Savings, FDs. Safety first.</p>
                        <Input
                            type="number"
                            value={allocation.conservative}
                            onChange={(e) => handleAllocationChange('conservative', e.target.value)}
                            className="font-mono text-right"
                            min="0" max="100"
                        />
                    </div>
                    <div className="space-y-2 rounded-md border p-3 border-l-4 border-l-yellow-500 bg-yellow-50/50">
                        <label className="text-sm font-medium text-yellow-900">Moderate (%)</label>
                        <p className="text-xs text-muted-foreground mb-2">Funds, Debt. Balanced.</p>
                        <Input
                            type="number"
                            value={allocation.moderate}
                            onChange={(e) => handleAllocationChange('moderate', e.target.value)}
                            className="font-mono text-right"
                            min="0" max="100"
                        />
                    </div>
                    <div className="space-y-2 rounded-md border p-3 border-l-4 border-l-red-500 bg-red-50/50">
                        <label className="text-sm font-medium text-red-900">Aggressive (%)</label>
                        <p className="text-xs text-muted-foreground mb-2">Stocks, Crypto. High Growth.</p>
                        <Input
                            type="number"
                            value={allocation.aggressive}
                            onChange={(e) => handleAllocationChange('aggressive', e.target.value)}
                            className="font-mono text-right"
                            min="0" max="100"
                        />
                    </div>
                </div>
                {totalAllocation !== 100 && (
                    <p className="text-sm text-destructive font-medium text-center">
                        Total allocation must equal 100% (Current: {totalAllocation}%)
                    </p>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-md border px-4 py-2 hover:bg-accent"
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    disabled={loading || totalAllocation !== 100}
                >
                    {loading && <LoadingSpinner size="sm" className="mr-2" />}
                    Save Profile
                </button>
            </div>
        </form>
    );
};
