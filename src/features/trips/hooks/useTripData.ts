import { useSubcollection } from './useTripSubcollection';
import { TripExpense, TripFund, TripReturn } from '../types';

export function useTripFunds(tripId: string) {
    const { data, loading, error, add, update, remove } = useSubcollection<TripFund>(tripId, 'travelFunds');
    return { funds: data, fundsLoading: loading, fundsError: error, addFund: add, updateFund: update, removeFund: remove };
}

export function useTripExpenses(tripId: string) {
    const { data, loading, error, add, update, remove } = useSubcollection<TripExpense>(tripId, 'expenses');
    return { expenses: data, expensesLoading: loading, expensesError: error, addExpense: add, updateExpense: update, removeExpense: remove };
}

export function useTripReturns(tripId: string) {
    const { data, loading, error, add, update, remove } = useSubcollection<TripReturn>(tripId, 'returns');
    return { returns: data, returnsLoading: loading, returnsError: error, addReturn: add, updateReturn: update, removeReturn: remove };
}
