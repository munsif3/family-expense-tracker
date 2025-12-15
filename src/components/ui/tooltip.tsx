import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    className?: string; // For the tooltip content container
    side?: 'top' | 'bottom';
}

export function Tooltip({ children, content, className, side = 'top' }: TooltipProps) {
    const [visible, setVisible] = useState(false);

    return (
        <div
            className="relative inline-flex items-center"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {children}
            {visible && (
                <div
                    className={cn(
                        "absolute left-1/2 -translate-x-1/2 px-3 py-1.5 bg-popover text-popover-foreground text-xs rounded-md shadow-md border z-50 whitespace-nowrap",
                        side === 'top' ? "bottom-full mb-2" : "top-full mt-2",
                        className
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    );
}

// Compatibility exports to match potential future shadcn usage if needed (though API differs)
export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const TooltipTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const TooltipContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
