import { Transaction } from '@/types';
import { format } from 'date-fns';

export function groupTransactionsByDate(transactions: Transaction[]) {
    return transactions.reduce((groups, tx) => {
        const date = tx.date.toDate();
        let key = format(date, 'MMMM d, yyyy');
        if (format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) key = 'Today';
        else if (format(date, 'yyyy-MM-dd') === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')) key = 'Yesterday';

        if (!groups[key]) groups[key] = [];
        groups[key].push(tx);
        return groups;
    }, {} as Record<string, Transaction[]>);
}
