import * as z from 'zod';

// Base schema shared by all assets
export const baseAssetSchema = z.object({
    name: z.string().min(2, "Name is required"),
    type: z.string(),
    amountInvested: z.string().min(1, "Amount is required"),
    currentValue: z.string().optional(),
    buyDate: z.string().min(1, "Date is required"),
    source: z.string().optional(),
    ownerIds: z.array(z.string()).min(1, "Select at least one owner"),
    // Foreign Currency Fields
    isForeignCurrency: z.boolean().optional(),
    originalCurrency: z.string().optional(),
    originalAmount: z.string().optional(),
    exchangeRate: z.string().optional(),
});

// Type-specific schemas (meta fields)
export const fdSchema = z.object({
    bankName: z.string().min(2, "Bank Name is required"),
    interestRate: z.string().min(1, "Interest Rate is required"), // Store as string for input, parse later
    maturityDate: z.string().min(1, "Maturity Date is required"),
    maturityAmount: z.string().optional(),
});

export const goldSchema = z.object({
    weightInGrams: z.string().min(1, "Weight is required"),
    purityInKarats: z.string().optional(), // e.g. "24K", "22K"
    makingCharges: z.string().optional(),
});

export const stockSchema = z.object({
    ticker: z.string().min(1, "Ticker symbol is required"),
    quantity: z.string().min(1, "Quantity is required"),
    currentPrice: z.string().optional(), // Can be auto-fetched in future
    broker: z.string().optional(),
});

export const propertySchema = z.object({
    location: z.string().min(2, "Location is required"),
    areaInSqFt: z.string().optional(),
    registrationValue: z.string().optional(),
});

export const monthlySavingSchema = z.object({
    schemeName: z.string().optional(),
    monthlyAmount: z.string().min(1, "Monthly Amount is required"),
    startDate: z.string().min(1, "Start Date is required"),
    accumulatedAmount: z.string().optional(),
});

export const cryptoSchema = z.object({
    symbol: z.string().min(1, "Symbol is required (e.g. BTC)"),
    quantity: z.string().min(1, "Quantity is required"),
    wallet: z.string().optional(),
});

export const jewellerySchema = z.object({
    description: z.string().optional(),
    weightInGrams: z.string().optional(),
    valuation: z.string().optional(),
});

export const bankAssetSchema = baseAssetSchema.extend({
    bankName: z.string().min(1, "Bank Name is required"),
    accountNumber: z.string().optional(),
    accountType: z.enum(['Savings', 'Checking', 'Current', 'Wallet', 'Other']).default('Savings'),
});

// Map types to their specific schemas
export const ASSET_META_SCHEMAS: Record<string, z.ZodObject<any>> = {
    'FD': fdSchema,
    'Gold': goldSchema,
    'Stock': stockSchema,
    'Property': propertySchema,
    'MonthlySaving': monthlySavingSchema,
    'Crypto': cryptoSchema,
    'Jewellery': jewellerySchema,
};

// Helper to get the full schema based on selected type
export function getAssetSchema(type: string) {
    const metaSchema = ASSET_META_SCHEMAS[type];
    if (metaSchema) {
        return baseAssetSchema.merge(metaSchema);
    }
    // Specific check for Bank since it's defined separately above (or add to ASSET_META_SCHEMAS)
    if (type === 'Bank') {
        return bankAssetSchema;
    }
    return baseAssetSchema;
}

// Type inference helper
// Note on unions: To get a fully strictly typed inferred union would be complex. 
// For practical form usage, we often use an intersection or a loose record.
export type AssetFormValues = z.infer<typeof baseAssetSchema> & Record<string, any>;
