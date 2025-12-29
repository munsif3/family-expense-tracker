import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { Asset } from '@/types';
import { useAddAsset } from './useAddAsset';
import { DatePicker } from '@/components/ui/date-picker';
import { Controller } from 'react-hook-form';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface AddAssetModalProps {
    assetToEdit?: Asset;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddAssetModal({ assetToEdit, open: controlledOpen, onOpenChange }: AddAssetModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const { form, loading, submitAsset, ASSET_TYPES, members } = useAddAsset(assetToEdit, isOpen, setOpen);
    const selectedType = form.watch('type');
    const isForeign = form.watch('isForeignCurrency');

    // Auto-calculate home currency amount
    const originalAmount = form.watch('originalAmount');
    const exchangeRate = form.watch('exchangeRate');

    // Use useEffect to update amountInvested when inputs change
    // We only update if isForeign is true to avoid overwriting manual input otherwise
    if (isForeign && originalAmount && exchangeRate) {
        const calculated = (parseFloat(originalAmount) * parseFloat(exchangeRate)).toFixed(2);
        if (!isNaN(parseFloat(calculated)) && form.getValues('amountInvested') !== calculated) {
            form.setValue('amountInvested', calculated, { shouldValidate: true });
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            {!assetToEdit && controlledOpen === undefined && (
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Investment
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{assetToEdit ? 'Edit Investment' : 'Add New Investment'}</DialogTitle>
                    <DialogDescription>
                        Track your FDs, Gold, Stocks, or other assets.
                    </DialogDescription>
                </DialogHeader>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <form onSubmit={form.handleSubmit(submitAsset as any)} className="space-y-4 pt-4">

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Type</Label>
                        <div className="col-span-3">
                            <Select
                                onValueChange={(val) => form.setValue('type', val)}
                                defaultValue={form.getValues('type')}
                                value={form.watch('type')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Asset Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ASSET_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" className="col-span-3" placeholder="Asset Name" {...form.register('name')} />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Invested</Label>
                        <div className="col-span-3 space-y-2">
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...form.register('amountInvested')}
                                readOnly={!!isForeign}
                                className={isForeign ? "bg-muted" : ""}
                            />
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isForeign"
                                    className="h-4 w-4 rounded border-gray-300 accent-primary focus:ring-primary"
                                    {...form.register('isForeignCurrency')}
                                />
                                <Label htmlFor="isForeign" className="font-normal text-xs text-muted-foreground cursor-pointer">
                                    Paid in foreign currency?
                                </Label>
                            </div>
                        </div>
                    </div>

                    {isForeign && (
                        <div className="p-3 bg-muted/30 rounded-md space-y-3 border border-dashed">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="origAmount" className="text-right text-xs">Orig. Amount</Label>
                                <Input id="origAmount" type="number" step="0.01" className="col-span-3 h-8 text-sm" placeholder="e.g. 1000" {...form.register('originalAmount')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="origCurr" className="text-right text-xs">Currency</Label>
                                <Input id="origCurr" className="col-span-3 h-8 text-sm" placeholder="e.g. SGD" {...form.register('originalCurrency')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="exRate" className="text-right text-xs">Rate</Label>
                                <Input id="exRate" type="number" step="0.01" className="col-span-3 h-8 text-sm" placeholder="e.g. 62.5" {...form.register('exchangeRate')} />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="current" className="text-right">Cur. Value</Label>
                        <Input id="current" type="number" step="0.01" className="col-span-3" placeholder="(Optional)" {...form.register('currentValue')} />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Buy Date</Label>
                        <div className="col-span-3">
                            <Controller
                                control={form.control}
                                name="buyDate"
                                render={({ field }) => (
                                    <DatePicker date={field.value ? new Date(field.value) : undefined} setDate={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')} />
                                )}
                            />
                        </div>
                    </div>

                    {/* Dynamic Fields */}
                    {selectedType === 'FD' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="bankName" className="text-right">Bank Name</Label>
                                <Input id="bankName" className="col-span-3" placeholder="e.g. HDFC" {...form.register('bankName')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="interestRate" className="text-right">Interest %</Label>
                                <Input id="interestRate" className="col-span-3" placeholder="e.g. 7.5" {...form.register('interestRate')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="maturityDate" className="text-right">Maturity Date</Label>
                                <div className="col-span-3">
                                    <Controller
                                        control={form.control}
                                        name="maturityDate"
                                        render={({ field }) => (
                                            <DatePicker date={field.value ? new Date(field.value) : undefined} setDate={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')} />
                                        )}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {selectedType === 'Gold' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="weight" className="text-right">Weight (g)</Label>
                                <Input id="weight" className="col-span-3" placeholder="e.g. 10.5" {...form.register('weightInGrams')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="purity" className="text-right">Purity</Label>
                                <Input id="purity" className="col-span-3" placeholder="e.g. 24K" {...form.register('purityInKarats')} />
                            </div>
                        </>
                    )}

                    {selectedType === 'Stock' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="ticker" className="text-right">Ticker</Label>
                                <Input id="ticker" className="col-span-3" placeholder="e.g. NIFTYBEES" {...form.register('ticker')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="qty" className="text-right">Quantity</Label>
                                <Input id="qty" className="col-span-3" placeholder="e.g. 50" {...form.register('quantity')} />
                            </div>
                        </>
                    )}

                    {selectedType === 'Property' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="location" className="text-right">Location</Label>
                                <Input id="location" className="col-span-3" placeholder="City or Area" {...form.register('location')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="area" className="text-right">Area (sqft)</Label>
                                <Input id="area" className="col-span-3" placeholder="e.g. 1200" {...form.register('areaInSqFt')} />
                            </div>
                        </>
                    )}

                    {selectedType === 'MonthlySaving' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="monthlyAmount" className="text-right">Monthly Amt</Label>
                                <Input id="monthlyAmount" className="col-span-3" placeholder="e.g. 5000" {...form.register('monthlyAmount')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="startDate" className="text-right">Start Date</Label>
                                <div className="col-span-3">
                                    <Controller
                                        control={form.control}
                                        name="startDate"
                                        render={({ field }) => (
                                            <DatePicker date={field.value ? new Date(field.value) : undefined} setDate={(date) => field.onChange(date ? date.toISOString().split('T')[0] : '')} />
                                        )}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {selectedType === 'Crypto' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="symbol" className="text-right">Symbol</Label>
                                <Input id="symbol" className="col-span-3" placeholder="e.g. BTC" {...form.register('symbol')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cryptoQty" className="text-right">Quantity</Label>
                                <Input id="cryptoQty" className="col-span-3" placeholder="e.g. 0.5" {...form.register('quantity')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="wallet" className="text-right">Wallet</Label>
                                <Input id="wallet" className="col-span-3" placeholder="e.g. Metamask (Optional)" {...form.register('wallet')} />
                            </div>
                        </>
                    )}

                    {selectedType === 'Jewellery' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">Description</Label>
                                <Input id="description" className="col-span-3" placeholder="e.g. Gold Necklace" {...form.register('description')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="jWeight" className="text-right">Weight (g)</Label>
                                <Input id="jWeight" className="col-span-3" placeholder="e.g. 20" {...form.register('weightInGrams')} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="valuation" className="text-right">Valuation</Label>
                                <Input id="valuation" className="col-span-3" placeholder="e.g. Certified Value" {...form.register('valuation')} />
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="source" className="text-right">Source</Label>
                        <Input id="source" className="col-span-3" placeholder="e.g. Savings from Bank A" {...form.register('source')} />
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Owners</Label>
                        <div className="col-span-3 space-y-2 border rounded-md p-3">
                            {members.length === 0 && <p className="text-sm text-muted-foreground">Loading members...</p>}
                            {members.map(member => (
                                <div key={member.uid} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`owner-${member.uid}`}
                                        checked={form.watch('ownerIds')?.includes(member.uid)}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            const current = form.getValues('ownerIds') || [];
                                            if (checked) {
                                                form.setValue('ownerIds', [...current, member.uid], { shouldValidate: true });
                                            } else {
                                                form.setValue('ownerIds', current.filter(id => id !== member.uid), { shouldValidate: true });
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 accent-primary focus:ring-primary"
                                    />
                                    <Label htmlFor={`owner-${member.uid}`} className="cursor-pointer">
                                        {member.displayName || member.email || 'Unknown User'}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Show generic error if any required field is missing */}
                    {Object.keys(form.formState.errors).length > 0 && (
                        <div className="text-red-500 text-xs text-center border border-red-200 bg-red-50 p-2 rounded">
                            Please check all required fields above
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <LoadingSpinner size="sm" className="mr-2" /> : (assetToEdit ? 'Update Asset' : 'Save Asset')}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
