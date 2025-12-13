'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, PiggyBank, PieChart, Lock, LogOut, Wallet, Settings, CalendarClock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

const NAV_ITEMS = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Savings', href: '/savings', icon: PiggyBank },
    { name: 'Budget', href: '/budget', icon: PieChart },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Subscriptions', href: '/subscriptions', icon: CalendarClock },
    { name: 'Vault', href: '/vault', icon: Lock },
    { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
    className?: string; // allow overriding classes (e.g., removing 'hidden')
    onClose?: () => void;
}

export function Sidebar({ className, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    const handleLinkClick = () => {
        if (onClose) onClose();
    };

    return (
        <div className={cn("border-r bg-background flex-col h-full", className)}>
            <div className="flex h-16 items-center border-b px-6">
                <Wallet className="h-6 w-6 text-primary mr-2" />
                <span className="font-bold text-lg tracking-tight">FinanceApp</span>
            </div>

            <div className="flex-1 flex flex-col justify-between py-6">
                <nav className="grid items-start px-4 text-sm font-medium gap-2">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={handleLinkClick}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                    isActive
                                        ? "bg-primary/10 text-primary font-semibold"
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-4">
                    <div className="border-t pt-4 mb-4">
                        <div className="flex items-center gap-3 px-3 py-2 mb-2">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
                                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-muted-foreground hover:text-destructive"
                            onClick={() => {
                                signOut(auth);
                                handleLinkClick();
                            }}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
