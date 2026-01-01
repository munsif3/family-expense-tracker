import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { doc, updateDoc } from 'firebase/firestore';

export const budgetService = {
    async updateCategoryBudget(categoryId: string, userBudgets: Record<string, number>, totalBudget: number) {
        await updateDoc(doc(db, COLLECTIONS.CATEGORIES, categoryId), {
            userBudgets,
            budgetMonthly: totalBudget
        });
    },

    async updateCategoryYearlyBudget(categoryId: string, year: number, amount: number) {
        await updateDoc(doc(db, COLLECTIONS.CATEGORIES, categoryId), {
            [`budgets.${year}`]: amount
        });
    }
};
