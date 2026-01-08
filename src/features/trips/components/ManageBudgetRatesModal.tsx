
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trip } from "../types";
import { tripService } from "@/lib/api/trips";
import { useState } from "react";
import { Trash2, Plus, ArrowRight } from "lucide-react";

interface ManageBudgetRatesModalProps {
    trip: Trip;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Validation Schema
const rateSchema = z.object({
    fromCurrency: z.string().min(1, "Required").toUpperCase(),
    toCurrency: z.string().min(1, "Required").toUpperCase(),
    rate: z.number().positive("Must be positive"),
});

type RateFormData = z.infer<typeof rateSchema>;

export function ManageBudgetRatesModal({ trip, open, onOpenChange }: ManageBudgetRatesModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, handleSubmit, reset, formState: { errors } } = useForm<RateFormData>({
        resolver: zodResolver(rateSchema),
        defaultValues: {
            fromCurrency: '',
            toCurrency: '',
            rate: 1
        }
    });

    const rates = trip.budgetRates || {};

    const onAddRate = async (data: RateFormData) => {
        if (data.fromCurrency === data.toCurrency) return;

        setIsSubmitting(true);
        try {
            const pairKey = `${data.fromCurrency}-${data.toCurrency}`;
            const updatedRates = {
                ...rates,
                [pairKey]: data.rate
            };

            await tripService.updateTrip(trip.id, { budgetRates: updatedRates });
            reset();
        } catch (error) {
            console.error("Failed to add rate:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onDeleteRate = async (pairKey: string) => {
        setIsSubmitting(true);
        try {
            const updatedRates = { ...rates };
            delete updatedRates[pairKey];
            await tripService.updateTrip(trip.id, { budgetRates: updatedRates });
        } catch (error) {
            console.error("Failed to delete rate:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Budget Exchange Rates</DialogTitle>
                    <DialogDescription>
                        Define manual exchange rates to see approximate values in your budget list.
                        (e.g., 1 USD = 3.67 AED)
                    </DialogDescription>
                </DialogHeader>

                {/* Add Rate Form */}
                <form onSubmit={handleSubmit(onAddRate)} className="flex items-end gap-2 mb-6 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-1 flex-1">
                        <Label className="text-xs">1 Unit of</Label>
                        <Input
                            {...register("fromCurrency")}
                            placeholder="USD"
                            className="uppercase"
                            maxLength={3}
                        />
                    </div>
                    <div className="pb-3 text-muted-foreground">=</div>
                    <div className="space-y-1 flex-1">
                        <Label className="text-xs">Valued at</Label>
                        <Input
                            {...register("rate", { valueAsNumber: true })}
                            type="number"
                            step="0.0001"
                            placeholder="3.67"
                        />
                    </div>
                    <div className="space-y-1 flex-1">
                        <Label className="text-xs">Currency</Label>
                        <Input
                            {...register("toCurrency")}
                            placeholder="AED"
                            className="uppercase"
                            maxLength={3}
                        />
                    </div>
                    <Button type="submit" size="icon" disabled={isSubmitting}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </form>

                {/* Rates List */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Defined Rates</h4>
                    {Object.entries(rates).length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No custom rates defined.</p>
                    )}
                    <div className="grid gap-2">
                        {Object.entries(rates).map(([pair, rate]) => {
                            const [from, to] = pair.split('-');
                            return (
                                <div key={pair} className="flex items-center justify-between p-3 bg-card border rounded-md shadow-sm">
                                    <div className="flex items-center gap-2 font-medium">
                                        <span>1 {from}</span>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        <span>{rate} {to}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                                        onClick={() => onDeleteRate(pair)}
                                        disabled={isSubmitting}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
