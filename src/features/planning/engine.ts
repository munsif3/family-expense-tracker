import { FinancialGoal, FinancialProfile, FeasibilityStatus, Asset, GoalPriority } from '@/types';
import { calculateStrategy, StrategyResult, calculateGrowthMultiplier } from './strategy';

export interface FeasibilityResult {
    status: FeasibilityStatus;
    reason: string;
    requiredMonthly: number;
    fundingGap: number;
    monthsToDeadline: number;
    timelineIssues: string[];
    bucketUsed?: string;
}

export interface PlanResult {
    goals: (FinancialGoal & {
        feasibility: FeasibilityResult;
        strategy?: StrategyResult | null;
    })[];
    monthlyUnallocated: number;
    buckets: {
        conservative: { total: number, remaining: number };
        moderate: { total: number, remaining: number };
        aggressive: { total: number, remaining: number };
    };
}

const MILLISECONDS_IN_MONTH = 1000 * 60 * 60 * 24 * 30.44;

export const checkFeasibility = (
    goals: FinancialGoal[],
    profile: FinancialProfile,
    assets: Asset[] = [],
    currentDate: Date = new Date()
): PlanResult => {
    // 1. Calculate Pools
    const totalMonthlySavings = profile.savingsCapacity.reduce((sum, s) => sum + s.amount, 0);

    // Default allocations if missing (fallback)
    const alloc = profile.riskAllocation || { conservative: 100, moderate: 0, aggressive: 0 };

    const pools = {
        conservative: totalMonthlySavings * (alloc.conservative / 100),
        moderate: totalMonthlySavings * (alloc.moderate / 100),
        aggressive: totalMonthlySavings * (alloc.aggressive / 100)
    };

    // Track remaining in pools
    const remainingPools = { ...pools };

    // 2. Sort Goals
    const sortedGoals = [...goals].sort((a, b) => {
        const pA = getPriorityScore(a.priority);
        const pB = getPriorityScore(b.priority);
        if (pA !== pB) return pB - pA;
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_VALUE;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_VALUE;
        return dateA - dateB;
    });

    const results: (FinancialGoal & {
        feasibility: FeasibilityResult;
        strategy?: StrategyResult | null;
    })[] = [];

    // 3. Allocation Loop
    for (const goal of sortedGoals) {
        if (!goal.deadline) {
            results.push(createInfeasibleResult(goal, 'No deadline set'));
            continue;
        }

        const deadline = new Date(goal.deadline);
        const months = Math.max((deadline.getTime() - currentDate.getTime()) / MILLISECONDS_IN_MONTH, 0.1);

        // Calculate Linked Assets Value
        const linkedAssetsValue = goal.fundingSourceIds?.reduce((sum, id) => {
            const asset = assets.find(a => a.id === id);
            return sum + (asset?.currentValue || asset?.amountInvested || 0);
        }, 0) || 0;

        const totalCurrentFunding = goal.currentAmount + linkedAssetsValue;
        const requiredTotal = Math.max(goal.targetAmount - totalCurrentFunding, 0);
        const requiredMonthly = requiredTotal / months;

        let status: FeasibilityStatus = 'feasible';
        let reason = 'On track';
        let fundingGap = 0;
        let bucketUsed = 'None';
        const timelineIssues: string[] = [];

        // Determine Allowed Buckets based on Horizon/Risk
        // Short term (< 2y) -> Conservative Only
        // Medium term (2-5y) -> Conservative or Moderate
        // Long term (> 5y) -> Any (Prefer Aggressive > Moderate > Conservative)

        let fundedAmount = 0;

        if (months < 24) {
            // Short Term: Strict Safety. Override not recommended for Short Term unless user insists?
            // If user insists on Aggressive for 1 year, do we allow?
            // Current logic: Strict Safety.
            if (remainingPools.conservative >= requiredMonthly) {
                remainingPools.conservative -= requiredMonthly;
                fundedAmount = requiredMonthly;
                bucketUsed = 'Conservative';
            } else {
                // Shortfall in conservative
                fundedAmount = remainingPools.conservative;
                remainingPools.conservative = 0;
                status = 'not-feasible';
                reason = 'Insufficient conservative allocation for short-term goal.';
                timelineIssues.push(`Goal is short-term (<2y). Needs safe funds, but conservative bucket is empty.`);
            }
        } else if (months < 60) {
            // Medium Term
            // Try Moderate -> Conservative
            if (remainingPools.moderate >= requiredMonthly) {
                remainingPools.moderate -= requiredMonthly;
                fundedAmount = requiredMonthly;
                bucketUsed = 'Moderate';
            } else {
                fundedAmount += remainingPools.moderate;
                const needed = requiredMonthly - fundedAmount;
                remainingPools.moderate = 0;

                if (remainingPools.conservative >= needed) {
                    remainingPools.conservative -= needed;
                    fundedAmount += needed;
                    bucketUsed = 'Moderate + Conservative';
                } else {
                    fundedAmount += remainingPools.conservative;
                    remainingPools.conservative = 0;
                    status = 'not-feasible';
                    reason = 'Insufficient Moderate/Conservative funds.';
                }
            }
        } else {
            // Long Term (or Manual Risk Override)
            // Determine effective buckets to try based on Override or Logic
            let bucketPriority: ('aggressive' | 'moderate' | 'conservative')[] = [];

            if (goal.riskLevel === 'aggressive') {
                bucketPriority = ['aggressive', 'moderate', 'conservative'];
            } else if (goal.riskLevel === 'moderate') {
                bucketPriority = ['moderate', 'conservative'];
            } else if (goal.riskLevel === 'conservative') {
                bucketPriority = ['conservative'];
            } else {
                // AUTO LOGIC
                if (months < 24) bucketPriority = ['conservative'];
                else if (months < 60) bucketPriority = ['moderate', 'conservative'];
                else bucketPriority = ['aggressive', 'moderate', 'conservative'];
            }

            // For long-term allocations (>12m), check if we can assume growth on capacity.
            const useGrowth = months > 12;
            const growthMult = useGrowth ? calculateGrowthMultiplier(
                months / 12,
                profile.incomeGrowthRate || 0,
                profile.annualBonus || 0,
                totalMonthlySavings
            ) : 1.0;

            let needed = requiredMonthly;
            const usedBucketsList: string[] = [];

            // Generic Allocation Loop
            for (const bucket of bucketPriority) {
                if (needed <= 0.01) break;

                const poolAmount = remainingPools[bucket];
                // If pool is empty or negative from floating point, skip
                if (poolAmount <= 0.01) continue;

                // Effective capacity (virtual)
                const effectivePool = poolAmount * growthMult;

                const amountFromBucket = Math.min(effectivePool, needed);

                if (amountFromBucket > 0) {
                    // Deduct from real pool (scaled down)
                    remainingPools[bucket] -= (amountFromBucket / growthMult);
                    remainingPools[bucket] = Math.max(0, remainingPools[bucket]); // Safety clamp

                    needed -= amountFromBucket;
                    fundedAmount += amountFromBucket;
                    usedBucketsList.push(bucket.charAt(0).toUpperCase() + bucket.slice(1));
                }
            }

            // Set bucketUsed even if partial
            if (usedBucketsList.length > 0) {
                bucketUsed = usedBucketsList.join(' + ');
            }

            if (needed > 0.01) {
                status = 'not-feasible';
                const shortfall = needed.toFixed(0);
                if (goal.riskLevel) {
                    reason = `Insufficient funds in ${goal.riskLevel} allocation. Shortfall: ${shortfall}`;
                } else {
                    reason = `Insufficient total capacity. Shortfall: ${shortfall}`;
                }
            } else {
                // If fully funded
                if (!bucketUsed) bucketUsed = 'Funded';
            }
        }

        if (status === 'not-feasible') {
            fundingGap = requiredMonthly - fundedAmount;
            // Alternatives logic
            if (fundingGap > 0) {
                // Simple extension logic
                // If we have ANY free flow?
                const totalRemaining = remainingPools.conservative + remainingPools.moderate + remainingPools.aggressive;
                if (totalRemaining > 0) {
                    timelineIssues.push("Funds available in other buckets, but risk constraints prevent using them.");
                    timelineIssues.push("Consider adjusting risk allocation.");
                } else {
                    timelineIssues.push("Increase savings or extend deadline.");
                }
            }
        }

        // Pass effective current amount (cash + assets) to strategy
        const strategy = calculateStrategy({ ...goal, currentAmount: totalCurrentFunding }, profile);

        results.push({
            ...goal,
            feasibility: {
                status,
                reason,
                requiredMonthly,
                fundingGap,
                monthsToDeadline: months,
                timelineIssues,
                bucketUsed
            },
            strategy
        });
    }

    return {
        goals: results,
        monthlyUnallocated: remainingPools.conservative + remainingPools.moderate + remainingPools.aggressive,
        buckets: {
            conservative: { total: pools.conservative, remaining: remainingPools.conservative },
            moderate: { total: pools.moderate, remaining: remainingPools.moderate },
            aggressive: { total: pools.aggressive, remaining: remainingPools.aggressive }
        }
    };
};



// Re-export specific types if needed by other components, although checking imports usually reveals if they are used. 
// FeasibilityResult and PlanResult remain here.

export type { StrategyResult };

const getPriorityScore = (p?: GoalPriority): number => {
    switch (p) {
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 1;
    }
}

const createInfeasibleResult = (goal: FinancialGoal, reason: string) => ({
    ...goal,
    feasibility: {
        status: 'not-feasible' as FeasibilityStatus,
        reason,
        requiredMonthly: 0,
        fundingGap: 0,
        monthsToDeadline: 0,
        timelineIssues: []
    }
});
