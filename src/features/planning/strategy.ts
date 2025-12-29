import { FinancialGoal, FinancialProfile, GoalPriority } from '@/types';

export interface StrategyResult {
    futureValue: number;
    inflationAdjustedTarget: number;
    requiredMonthlyContribution: number;
    suggestedAllocation: {
        conservative: number;
        moderate: number;
        aggressive: number;
    };
    assumptions: {
        inflationRate: number;
        returnRate: number;
    };
    contributionSplit?: {
        userId: string;
        userName?: string;
        amount: number;
        percentage: number;
    }[];
}

export const calculateStrategy = (
    goal: FinancialGoal,
    profile: FinancialProfile
): StrategyResult | null => {
    if (!goal.deadline) return null;

    const deadline = new Date(goal.deadline);
    const now = new Date();
    const years = Math.max((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365.25), 0.1);

    // Assumptions (Could be moved to profile settings)
    const INFLATION_RATE = 0.06; // 6%
    const RETURNS = {
        conservative: 0.06, // 6%
        moderate: 0.10,     // 10%
        aggressive: 0.15    // 15%
    };

    // 1. Future Value (Inflation Adjustment)
    const pv = goal.targetAmount;
    const fv = pv * Math.pow(1 + INFLATION_RATE, years);

    // 2. Determine Strategy based on Horizon & Profile
    // Logic: 
    // < 3y: Conservative
    // 3-7y: Moderate (Mix)
    // > 7y: Aggressive (High Growth Focus)

    let allocation = { conservative: 0, moderate: 0, aggressive: 0 };
    let avgReturn = 0;

    if (years < 3) {
        allocation = { conservative: 100, moderate: 0, aggressive: 0 };
        avgReturn = RETURNS.conservative;
    } else if (years < 7) {
        allocation = { conservative: 20, moderate: 80, aggressive: 0 }; // Balanced
        avgReturn = (0.2 * RETURNS.conservative) + (0.8 * RETURNS.moderate);
    } else {
        // Long term - prioritize growth to beat inflation
        allocation = { conservative: 10, moderate: 30, aggressive: 60 };
        avgReturn = (0.1 * RETURNS.conservative) + (0.3 * RETURNS.moderate) + (0.6 * RETURNS.aggressive);
    }

    // 3. Calculate PMT (Monthly Contribution)
    // FV = PMT * (((1 + r)^n - 1) / r)
    // PMT = FV * r / ((1 + r)^n - 1)

    const r = avgReturn / 12; // Monthly rate
    const n = years * 12;     // Months

    let pmt = 0;
    if (r === 0) {
        pmt = (fv - goal.currentAmount) / n;
    } else {
        // Adjust for current amount growing
        const currentGrowsTo = goal.currentAmount * Math.pow(1 + r, n);
        const remainingTarget = Math.max(0, fv - currentGrowsTo);

        if (remainingTarget > 0) {
            pmt = remainingTarget * r / (Math.pow(1 + r, n) - 1);
        }
    }

    // 4. Contribution Split (New Logic)
    let contributionSplit: StrategyResult['contributionSplit'] = [];
    if (pmt > 0 && profile.income && profile.income.length > 0) {
        // Calculate Total Net Household Income
        const totalNetIncome = profile.income.reduce((sum, item) => sum + (item.netMonthly || 0), 0);

        if (totalNetIncome > 0) {
            contributionSplit = profile.income.map(item => {
                const share = (item.netMonthly || 0) / totalNetIncome;
                return {
                    userId: item.userId,
                    amount: pmt * share,
                    percentage: share * 100
                };
            });
        }
    }

    return {
        futureValue: fv,
        inflationAdjustedTarget: fv, // redundancy for clarity
        requiredMonthlyContribution: pmt,
        suggestedAllocation: allocation,
        assumptions: {
            inflationRate: INFLATION_RATE,
            returnRate: avgReturn
        },
        contributionSplit
    };
};

// Returns a multiplier > 1 representing the average capacity increase over N years
// due to income growth and bonuses.
export const calculateGrowthMultiplier = (years: number, annualGrowthRate: number, annualBonus: number, currentMonthly: number): number => {
    if (years <= 1) return 1; // No growth effect for short term

    let totalCapacity = 0;
    let currentAnnual = currentMonthly * 12;

    for (let i = 0; i < Math.ceil(years); i++) {
        totalCapacity += currentAnnual + annualBonus;
        currentAnnual *= (1 + annualGrowthRate / 100);
    }

    // Average Monthly Capacity over the period
    const averageMonthly = totalCapacity / (Math.ceil(years) * 12);

    return averageMonthly / currentMonthly;
};
