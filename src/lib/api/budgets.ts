import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const budgetService = {
    async updateCategoryBudget(categoryId: string, userBudgets: Record<string, number>, totalBudget: number) {
        await updateDoc(doc(db, 'categories', categoryId), {
            userBudgets,
            budgetMonthly: totalBudget
        });
    },

    async updateCategoryYearlyBudget(categoryId: string, year: number, amount: number) {
        await updateDoc(doc(db, 'categories', categoryId), {
            [`budgets.${year}`]: amount
        });
    }
};
