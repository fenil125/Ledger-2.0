import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ShoppingCart, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { isWithinInterval, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, startOfDay, endOfDay } from "date-fns";

import StatsCards from "../components/dashboard/StatsCards.jsx";
import TransactionTable from "../components/dashboard/TransactionTable";
import FilterBar from "../components/dashboard/FilterBar";
import BuyingForm from "../components/forms/BuyingForm";
import SellingForm from "../components/forms/SellingForm";

export default function Dashboard() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('buying');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteTransaction, setDeleteTransaction] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [partyFilter, setPartyFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date'),
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  // Fetch stats summary including party payments
  const { data: statsSummary } = useQuery({
    queryKey: ['statsSummary'],
    queryFn: () => base44.getStatsSummary(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      setShowAddDialog(false);
      setEditingTransaction(null);
      toast.success('Transaction created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create transaction');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      setShowAddDialog(false);
      setEditingTransaction(null);
      toast.success('Transaction updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update transaction');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      setDeleteTransaction(null);
      toast.success('Transaction deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete transaction');
    },
  });

  const handleSubmit = (data) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setActiveTab(transaction.transaction_type);
    setShowAddDialog(true);
  };

  const handleDelete = (transaction) => {
    setDeleteTransaction(transaction);
  };

  const confirmDelete = () => {
    if (deleteTransaction) {
      deleteMutation.mutate(deleteTransaction.id);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setPartyFilter('all');
    setPeriodFilter('all');
    setDateRange({ from: null, to: null });
  };

  // Calculate period date range
  const getPeriodDateRange = () => {
    const now = new Date();
    switch (periodFilter) {
      case 'daily':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'monthly':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'quarterly':
        return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case 'yearly':
        return { from: startOfYear(now), to: endOfYear(now) };
      default:
        return { from: null, to: null };
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        t.party_name?.toLowerCase().includes(search) ||
        t.phone?.toLowerCase().includes(search) ||
        t.item_name?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Type filter
    if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;

    // Party filter
    if (partyFilter !== 'all' && t.party_name !== partyFilter) return false;

    // Period filter (Monthly, Quarterly, Yearly)
    const periodRange = getPeriodDateRange();
    if (periodRange.from && periodRange.to && t.date) {
      const txDate = new Date(t.date);
      if (!isWithinInterval(txDate, { start: periodRange.from, end: periodRange.to })) return false;
    }

    // Date range filter (separate from period)
    if (dateRange.from && dateRange.to && t.date) {
      const txDate = new Date(t.date);
      if (!isWithinInterval(txDate, { start: dateRange.from, end: dateRange.to })) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage your buying and selling transactions</p>
          </div>
          <Button
            onClick={() => {
              setEditingTransaction(null);
              setShowAddDialog(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="mb-8">
          <StatsCards transactions={filteredTransactions} statsSummary={statsSummary} />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <FilterBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            parties={parties}
            partyFilter={partyFilter}
            setPartyFilter={setPartyFilter}
            onClearFilters={clearFilters}
          />
        </div>

        {/* Table */}
        <TransactionTable
          transactions={filteredTransactions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showUser={true}
        />

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="buying" className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Buying
                </TabsTrigger>
                <TabsTrigger value="selling" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Selling
                </TabsTrigger>
              </TabsList>

              <TabsContent value="buying">
                <BuyingForm
                  transaction={editingTransaction?.transaction_type === 'buying' ? editingTransaction : null}
                  parties={parties}
                  onSubmit={handleSubmit}
                  isLoading={createMutation.isPending || updateMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="selling">
                <SellingForm
                  transaction={editingTransaction?.transaction_type === 'selling' ? editingTransaction : null}
                  parties={parties}
                  onSubmit={handleSubmit}
                  isLoading={createMutation.isPending || updateMutation.isPending}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTransaction} onOpenChange={() => setDeleteTransaction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}