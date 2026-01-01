
import {
    Utensils,
    Bus,
    Plane,
    BedDouble,
    ShoppingBag,
    Coins,
    MoreHorizontal
} from 'lucide-react';
import { ExpenseCategory } from './types';

export const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: React.ElementType; color: string }> = {
    food: { label: 'Food', icon: Utensils, color: 'text-orange-500' },
    transport: { label: 'Transport', icon: Bus, color: 'text-blue-500' },
    travel: { label: 'Travel', icon: Plane, color: 'text-sky-500' },
    accommodation: { label: 'Accommodation', icon: BedDouble, color: 'text-indigo-500' },
    shopping: { label: 'Shopping', icon: ShoppingBag, color: 'text-pink-500' },
    tips: { label: 'Tips', icon: Coins, color: 'text-yellow-500' },
    other: { label: 'Other', icon: MoreHorizontal, color: 'text-gray-500' },
};
