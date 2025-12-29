import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    text?: string;
    fullScreen?: boolean;
}

export function LoadingSpinner({
    size = 'md',
    className,
    text,
    fullScreen = false,
    ...props
}: LoadingSpinnerProps) {

    // Map size props to pixel dimensions
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
    };

    const containerClasses = fullScreen
        ? "fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50"
        : "flex flex-col items-center justify-center p-4";

    return (
        <div className={cn(containerClasses, className)} {...props}>
            <Loader2
                className={cn(
                    "animate-spin text-primary",
                    sizeClasses[size]
                )}
            />
            {text && (
                <p className="mt-2 text-sm text-muted-foreground font-medium animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
}
