'use client';

import { useState } from 'react';
import { Menu, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

export function MobileHeader() {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex items-center justify-between p-4 border-b bg-background lg:hidden sticky top-0 z-40">
            <div className="flex items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg tracking-tight">FinanceApp</span>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Navigation Menu</SheetTitle>
                    </SheetHeader>
                    {/* Render Sidebar without the hidden class and with close handler */}
                    <Sidebar className="border-none" onClose={() => setOpen(false)} />
                </SheetContent>
            </Sheet>
        </div>
    );
}
