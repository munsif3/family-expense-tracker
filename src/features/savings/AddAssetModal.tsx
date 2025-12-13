import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { Asset } from '@/types';
import { useAddAsset } from './useAddAsset';

interface AddAssetModalProps {
    assetToEdit?: Asset;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddAssetModal({ assetToEdit, open: controlledOpen, onOpenChange }: AddAssetModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const { form, loading, submitAsset, ASSET_TYPES } = useAddAsset(assetToEdit, isOpen, setOpen);

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            {!assetToEdit && (
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Investment
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{assetToEdit ? 'Edit Investment' : 'Add New Investment'}</DialogTitle>
                    <DialogDescription>
                        Track your FDs, Gold, Stocks, or other assets.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(submitAsset)} className="space-y-4 pt-4">

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
                        <Input id="name" className="col-span-3" placeholder="e.g. HDFC FD #123" {...form.register('name')} />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Invested</Label>
                        <Input id="amount" type="number" step="0.01" className="col-span-3" placeholder="0.00" {...form.register('amountInvested')} />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="current" className="text-right">Cur. Value</Label>
                        <Input id="current" type="number" step="0.01" className="col-span-3" placeholder="(Optional)" {...form.register('currentValue')} />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Buy Date</Label>
                        <Input id="date" type="date" className="col-span-3" {...form.register('buyDate')} />
                    </div>

                    {form.formState.errors.name && <p className="text-red-500 text-xs text-center">{form.formState.errors.name.message}</p>}
                    {form.formState.errors.amountInvested && <p className="text-red-500 text-xs text-center">{form.formState.errors.amountInvested.message}</p>}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (assetToEdit ? 'Update Asset' : 'Save Asset')}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
