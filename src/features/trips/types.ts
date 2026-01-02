import { Timestamp } from 'firebase/firestore';

export type TripType = 'local' | 'international';

export interface TripAccommodation {
  name: string;
  location: string; // URL or address
  fromDate: Timestamp;
  toDate: Timestamp;
}

export interface Trip {
  id: string;
  tripName: string;
  location: string;
  tripType: TripType;
  startDate: Timestamp;
  endDate: Timestamp;
  // totalDuration is derived on client: endDate - startDate
  accommodations: TripAccommodation[];
  usedCurrencies: string[]; // e.g. ['USD', 'EUR']
  participantIds: string[]; // references to users collection
  createdBy: string;
  createdAt: Timestamp;
}

export type PaymentMode = 'card' | 'usd_cash' | 'eur_cash' | 'aed_cash' | 'other' | (string & {});

export interface TripFund {
  id: string;
  tripId: string;
  date: Timestamp;
  contributorId: string; // user ref
  mode: PaymentMode;
  amount: number;
  currency: string;
  conversionRate: number; // manual entry. 1 if currency == base
  baseAmount: number; // derived: amount * conversionRate
  source?: 'exchange' | 'asset'; // 'exchange' = bought with base currency, 'asset' = from existing savings
  exchangeLocation?: string;
  country?: string;
}

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'travel'
  | 'accommodation'
  | 'shopping'
  | 'tips'
  | 'other';

export interface TripExpense {
  id: string;
  tripId: string;
  date: Timestamp;
  amount: number;
  currency: string;
  conversionRate: number;
  baseAmount: number;
  mode: PaymentMode;
  paymentMethodId?: string; // Link to configured payment method
  paidBy: string; // user ref
  category: ExpenseCategory;
  notes?: string;
}

export interface TripReturn {
  id: string;
  tripId: string;
  date: Timestamp;
  description: string;
  amount: number;
  currency: string;
  conversionRate: number;
  baseAmount: number;
  receivedBy: string; // user ref
}
