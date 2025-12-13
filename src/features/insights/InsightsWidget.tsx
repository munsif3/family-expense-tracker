import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Insight } from './useFinancialInsights';
import { AlertCircle, TrendingUp, PartyPopper, ArrowRight, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface InsightsWidgetProps {
    insights: Insight[];
    loading?: boolean;
}

export function InsightsWidget({ insights, loading }: InsightsWidgetProps) {

    // Safety check in case insights is undefined
    const validInsights = useMemo(() => Array.isArray(insights) ? insights : [], [insights]);

    // if (validInsights.length === 0) return null; 

    const hasContent = validInsights.length > 0;

    // If we want to hide it completely when empty, keep the return null. 
    // But user asked "where is it", so let's show a "Good Healthy" state.
    if (!hasContent && !loading) {
        return (
            <Card className="border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/10 mb-8">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <PartyPopper className="h-5 w-5" />
                        <CardTitle className="text-lg">Financial Health: Excellent</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No spending alerts or anomalies detected. You are on track!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/10">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Lightbulb className="h-5 w-5" />
                    <CardTitle className="text-lg">AI Financial Insights</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="grid gap-3">
                {validInsights.map(insight => (
                    <div
                        key={insight.id}
                        className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border bg-background/60 shadow-sm",
                            insight.type === 'warning' && "border-red-200 bg-red-50/30",
                            insight.type === 'positive' && "border-green-200 bg-green-50/30",
                        )}
                    >
                        <div className="mt-0.5">
                            {insight.type === 'warning' && <AlertCircle className="h-5 w-5 text-red-500" />}
                            {insight.type === 'trend' && <TrendingUp className="h-5 w-5 text-blue-500" />}
                            {insight.type === 'positive' && <PartyPopper className="h-5 w-5 text-green-500" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm">{insight.title}</h4>
                                {insight.type === 'warning' && <Badge variant="destructive" className="h-5 text-[10px] px-1">Action Needed</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {insight.message}
                            </p>
                        </div>
                        {insight.action && (
                            <Button variant="ghost" size="sm" className="self-center">
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
