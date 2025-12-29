'use client';

import React from 'react';
import { FinancialGoal, FinancialProfile, Asset } from '@/types';
import { checkFeasibility, PlanResult } from '../engine';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Props {
    goals: FinancialGoal[];
    profile: FinancialProfile;
    assets?: Asset[];
}

export const FeasibilityView: React.FC<Props> = ({ goals, profile, assets }) => {
    // Run Engine
    const plan: PlanResult = React.useMemo(() => {
        return checkFeasibility(goals, profile, assets);
    }, [goals, profile, assets]);

    const { goals: processedGoals, monthlyUnallocated } = plan;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Monthly Capacity</h4>
                    <p className="text-xl font-bold">{formatCurrency(profile.savingsCapacity.reduce((s, x) => s + x.amount, 0), profile.currency)}</p>
                </div>
                <div className="rounded-lg border bg-blue-50 p-4 border-l-4 border-l-blue-500 shadow-sm">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-800">Unallocated Surplus</h4>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(monthlyUnallocated, profile.currency)}</p>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-lg font-semibold">Goal Strategy & Feasibility</h3>
                {processedGoals.map((goal) => (
                    <div key={goal.id} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b bg-muted/20">
                            <div className="flex items-center gap-3">
                                {goal.feasibility.status === 'feasible' && <CheckCircle className="h-6 w-6 text-green-500" />}
                                {goal.feasibility.status === 'conditionally-feasible' && <AlertTriangle className="h-6 w-6 text-yellow-500" />}
                                {goal.feasibility.status === 'not-feasible' && <XCircle className="h-6 w-6 text-red-500" />}

                                <div>
                                    <h4 className="text-lg font-semibold flex items-center gap-2">
                                        {goal.name}
                                        <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-background border">
                                            {goal.category}
                                        </span>
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Target: <strong>{formatCurrency(goal.targetAmount, profile.currency)}</strong> by {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No Date'}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 md:mt-0 text-right">
                                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Status</div>
                                <div className={`text-sm font-bold ${goal.feasibility.status === 'feasible' ? 'text-green-600' : goal.feasibility.status === 'not-feasible' ? 'text-red-600' : 'text-yellow-600'}`}>
                                    {goal.feasibility.reason}
                                </div>
                            </div>
                        </div>

                        {/* Analysis Grid */}
                        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                            {/* Left: Engine Logic (Constraint Check) */}
                            <div className="p-4 space-y-3">
                                <h5 className="font-semibold text-sm flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" /> Feasibility Check
                                </h5>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Required Monthly (Cash):</span>
                                        <span className="font-medium">{formatCurrency(goal.feasibility.requiredMonthly, profile.currency)}</span>
                                    </div>
                                    {goal.fundingSourceIds && goal.fundingSourceIds.length > 0 && (
                                        <div className="flex justify-between border-t border-b py-2 my-2">
                                            <span className="text-muted-foreground">Linked Assets:</span>
                                            <div className="text-right">
                                                {goal.fundingSourceIds.map(id => {
                                                    const a = assets?.find(asset => asset.id === id);
                                                    return a ? (
                                                        <div key={id} className="font-medium text-xs text-primary">
                                                            + {a.name}
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Funded By:</span>
                                        <span className="font-medium">{goal.feasibility.bucketUsed || 'None'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Funding Gap:</span>
                                        <span className={`font-medium ${goal.feasibility.fundingGap > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {formatCurrency(goal.feasibility.fundingGap, profile.currency)}
                                        </span>
                                    </div>
                                    {goal.feasibility.timelineIssues.length > 0 && (
                                        <div className="mt-2 pt-2 border-t space-y-1">
                                            {goal.feasibility.timelineIssues.map((issue, idx) => (
                                                <p key={idx} className="text-xs text-orange-600 flex items-start gap-1">
                                                    <span className="mt-1 block min-w-[4px] h-1 rounded-full bg-orange-400" />
                                                    {issue}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Strategy Engine (Smart Recommendation) */}
                            {goal.strategy && (
                                <div className="p-4 space-y-3 bg-blue-50/30">
                                    <h5 className="font-semibold text-sm flex items-center gap-2 text-blue-800">
                                        <Sparkles className="h-4 w-4" /> Smart Strategy
                                    </h5>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Inflation Adjusted Target ({goal.deadline ? new Date(goal.deadline).getFullYear() : 'Future'}):</p>
                                            <p className="text-xl font-bold text-blue-900">
                                                {formatCurrency(goal.strategy.futureValue, profile.currency)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                (Assumes {goal.strategy.assumptions.inflationRate * 100}% inflation)
                                            </p>
                                        </div>

                                        <div className="p-3 bg-card rounded border">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recommended Monthly Investment</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-lg font-bold text-primary">
                                                    {formatCurrency(goal.strategy.requiredMonthlyContribution, profile.currency)}
                                                </span>
                                                <span className="text-xs text-muted-foreground">/ month</span>
                                            </div>
                                            <p className="text-xs text-green-600 mt-1">
                                                Achievable with {(goal.strategy.assumptions.returnRate * 100).toFixed(1)}% avg return.
                                            </p>
                                        </div>

                                        {goal.strategy.contributionSplit && goal.strategy.contributionSplit.length > 0 ? (
                                            <div className="mt-4 pt-3 border-t border-blue-200">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Team Effort (Monthly Split)</p>
                                                <div className="space-y-2">
                                                    {goal.strategy.contributionSplit.map((split, i) => (
                                                        <div key={i} className="flex justify-between text-sm items-center">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-muted-foreground">Contributor {i + 1}</span>
                                                            </div>
                                                            <span className="font-bold text-blue-900">
                                                                {formatCurrency(split.amount, profile.currency)} <span className="text-xs font-normal text-muted-foreground">({split.percentage.toFixed(0)}%)</span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Suggested Asset Allocation</p>
                                                <div className="flex h-2 rounded-full overflow-hidden">
                                                    {goal.strategy.suggestedAllocation.conservative > 0 && <div style={{ width: `${goal.strategy.suggestedAllocation.conservative}%` }} className="bg-green-500" />}
                                                    {goal.strategy.suggestedAllocation.moderate > 0 && <div style={{ width: `${goal.strategy.suggestedAllocation.moderate}%` }} className="bg-yellow-500" />}
                                                    {goal.strategy.suggestedAllocation.aggressive > 0 && <div style={{ width: `${goal.strategy.suggestedAllocation.aggressive}%` }} className="bg-red-500" />}
                                                </div>
                                                <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                                                    {goal.strategy.suggestedAllocation.conservative > 0 && <span>Cons: {goal.strategy.suggestedAllocation.conservative}%</span>}
                                                    {goal.strategy.suggestedAllocation.moderate > 0 && <span>Mod: {goal.strategy.suggestedAllocation.moderate}%</span>}
                                                    {goal.strategy.suggestedAllocation.aggressive > 0 && <span>Aggr: {goal.strategy.suggestedAllocation.aggressive}%</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {monthlyUnallocated > 0 && (
                <div className="rounded-lg bg-blue-50 p-4 text-blue-800">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        <h4 className="font-semibold">Optimize Your Surplus</h4>
                    </div>
                    <p className="mt-1 text-sm">
                        You have an unallocated surplus of <strong>{formatCurrency(monthlyUnallocated, profile.currency)}</strong>.
                        The engine suggests investing this surplus according to your long-term risk profile to build wealth faster.
                    </p>
                </div>
            )}
        </div>
    );
};
