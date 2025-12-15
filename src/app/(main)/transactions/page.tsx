'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionList } from '@/features/transactions/TransactionList';
import { AddTransactionModal } from '@/features/transactions/AddTransactionModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTransactionsList } from '@/features/transactions/useTransactionsList';


import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';

export default function TransactionsPage() {
    const {
        filtered,
        loading,
        search,
        setSearch,
        categoryFilter,
        setCategoryFilter,
        categories,
        viewMode,
        setViewMode
    } = useTransactionsList();

    const [openAdd, setOpenAdd] = useState(false);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
                    <p className="text-muted-foreground mt-1">Manage your transaction history</p>
                </div>
                <Button onClick={() => setOpenAdd(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Transaction
                </Button>
            </div>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'family' | 'personal')} className="w-full">
                <TabsList className="mb-4">
                    <Tooltip content="All household transactions excluding personal expenses">
                        <TabsTrigger value="family">Household</TabsTrigger>
                    </Tooltip>
                    <Tooltip content="Your personal transactions">
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                    </Tooltip>
                </TabsList>

                <Card>
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search transactions..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-6">
                    <TransactionList transactions={filtered} loading={loading} />
                </div>
            </Tabs>

            <AddTransactionModal open={openAdd} onOpenChange={setOpenAdd} />
        </div>
    );
}
