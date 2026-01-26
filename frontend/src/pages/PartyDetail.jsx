import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ArrowLeft, Phone, Mail, MapPin, Calendar,
    TrendingUp, TrendingDown, Wallet, CreditCard,
    ChevronDown, ChevronUp, Plus, IndianRupee, Download, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'upi', label: 'UPI' },
    { value: 'cheque', label: 'Cheque' },
];

export default function PartyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [expandedTransaction, setExpandedTransaction] = useState(null);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showPartyPaymentDialog, setShowPartyPaymentDialog] = useState(false);
    const [selectedSellItem, setSelectedSellItem] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        notes: ''
    });
    const [partyPaymentForm, setPartyPaymentForm] = useState({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        notes: ''
    });

    // Fetch party details
    const { data: party, isLoading, error } = useQuery({
        queryKey: ['partyDetails', id],
        queryFn: () => base44.getPartyDetails(id),
    });

    // Create payment mutation
    const createPaymentMutation = useMutation({
        mutationFn: (data) => base44.createPayment(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['partyDetails', id]);
            setShowPaymentDialog(false);
            setSelectedSellItem(null);
            setPaymentForm({
                amount: '',
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod: 'cash',
                notes: ''
            });
            toast.success('Payment recorded successfully!');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to record payment');
        },
    });

    // Create party payment mutation
    const createPartyPaymentMutation = useMutation({
        mutationFn: (data) => base44.createPartyPayment(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['partyDetails', id]);
            setShowPartyPaymentDialog(false);
            setPartyPaymentForm({
                amount: '',
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod: 'cash',
                notes: ''
            });
            toast.success('Payment recorded successfully!');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to record payment');
        },
    });

    const handleRecordPayment = (sellItem) => {
        setSelectedSellItem(sellItem);
        setShowPaymentDialog(true);
    };

    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        if (!selectedSellItem) return;

        createPaymentMutation.mutate({
            sellItemId: selectedSellItem.id,
            amount: parseFloat(paymentForm.amount),
            paymentDate: paymentForm.paymentDate,
            paymentMethod: paymentForm.paymentMethod,
            notes: paymentForm.notes
        });
    };

    const handlePartyPaymentSubmit = (e) => {
        e.preventDefault();
        createPartyPaymentMutation.mutate({
            partyId: id,
            amount: parseFloat(partyPaymentForm.amount),
            paymentDate: partyPaymentForm.paymentDate,
            paymentMethod: partyPaymentForm.paymentMethod,
            notes: partyPaymentForm.notes
        });
    };

    const deletePartyPaymentMutation = useMutation({
        mutationFn: (paymentId) => base44.deletePartyPayment(paymentId),
        onSuccess: () => {
            queryClient.invalidateQueries(['partyDetails', id]);
            toast.success('Payment deleted successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete payment');
        }
    });

    const handleDeletePartyPayment = (paymentId) => {
        if (window.confirm('Are you sure you want to delete this payment? This will reverse Allocations.')) {
            deletePartyPaymentMutation.mutate(paymentId);
        }
    };

    const handleExportExcel = () => {
        if (!party) return;

        // Create CSV content
        let csvContent = '\uFEFF'; // BOM for Excel UTF-8

        // Party Info
        csvContent += 'PARTY DETAILS\n';
        csvContent += `Name,${party.name}\n`;
        csvContent += `Phone,${party.phone || '-'}\n`;
        csvContent += `Email,${party.email || '-'}\n`;
        csvContent += `Address,${party.address || '-'}\n\n`;

        // Summary
        csvContent += 'SUMMARY\n';
        csvContent += `Total Buying,₹${(party.summary?.buying_total || 0).toLocaleString()}\n`;
        csvContent += `Total Selling,₹${(party.summary?.selling_total || 0).toLocaleString()}\n`;
        csvContent += `Total Received,₹${(party.summary?.total_received || 0).toLocaleString()}\n`;
        csvContent += `Balance Due,₹${(party.summary?.balance_owed || 0).toLocaleString()}\n\n`;

        // Party Payments
        if (party.party_payments && party.party_payments.length > 0) {
            csvContent += 'PARTY PAYMENTS\n';
            csvContent += 'Date,Amount,Method,Notes\n';
            party.party_payments.forEach(p => {
                csvContent += `${p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy') : '-'},₹${(p.amount || 0).toLocaleString()},${p.payment_method || '-'},${p.notes || '-'}\n`;
            });
            csvContent += '\n';
        }

        // Transactions
        csvContent += 'TRANSACTIONS\n';
        csvContent += 'Date,Type,Total Weight,Total Amount,Pay Received,Balance,Notes\n';
        (party.transactions || []).forEach(t => {
            const payReceived = t.type === 'sell' && t.sell_items?.[0] ? t.sell_items[0].payment_received || 0 : '-';
            const balance = t.type === 'sell' && t.sell_items?.[0] ? t.sell_items[0].balance_left || 0 : '-';
            csvContent += `${t.date ? format(new Date(t.date), 'dd MMM yyyy') : '-'},${t.type === 'buy' ? 'BUY' : 'SELL'},${t.total_weight || 0}kg,₹${(t.total_payment || 0).toLocaleString()},${payReceived !== '-' ? '₹' + payReceived.toLocaleString() : '-'},${balance !== '-' ? '₹' + balance.toLocaleString() : '-'},${t.notes || '-'}\n`;
        });

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${party.name}_transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Exported to CSV successfully!');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 flex items-center justify-center">
                <div className="text-slate-500">Loading party details...</div>
            </div>
        );
    }

    if (error || !party) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 mb-4">Failed to load party details</p>
                    <Button onClick={() => navigate('/parties')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Parties
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button & Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/parties')}
                        className="mb-4 text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Parties
                    </Button>

                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                            {party.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-slate-900">{party.name}</h1>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                                {party.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-4 h-4" /> {party.phone}
                                    </span>
                                )}
                                {party.email && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="w-4 h-4" /> {party.email}
                                    </span>
                                )}
                                {party.address && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" /> {party.address}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={handleExportExcel}
                                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                            <Button
                                onClick={() => setShowPartyPaymentDialog(true)}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Record Payment
                            </Button>
                            <Badge variant={party.is_active ? 'default' : 'secondary'}>
                                {party.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                </motion.div>

                {/* Summary Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                >
                    <Card className="border-red-200 bg-red-50/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-red-600 mb-1">
                                <TrendingDown className="w-4 h-4" />
                                <span className="text-sm font-medium">Total Buying</span>
                            </div>
                            <p className="text-2xl font-bold text-red-700">
                                ₹{(party.summary?.buying_total || 0).toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-green-50/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-green-600 mb-1">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-sm font-medium">Total Selling</span>
                            </div>
                            <p className="text-2xl font-bold text-green-700">
                                ₹{(party.summary?.selling_total || 0).toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-blue-600 mb-1">
                                <Wallet className="w-4 h-4" />
                                <span className="text-sm font-medium">Received</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-700">
                                ₹{(party.summary?.total_received || 0).toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className={`border-2 ${party.summary?.balance_owed > 0 ? 'border-orange-300 bg-orange-50' : 'border-emerald-300 bg-emerald-50'}`}>
                        <CardContent className="p-4">
                            <div className={`flex items-center gap-2 mb-1 ${party.summary?.balance_owed > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                <CreditCard className="w-4 h-4" />
                                <span className="text-sm font-medium">Balance Due</span>
                            </div>
                            <p className={`text-2xl font-bold ${party.summary?.balance_owed > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                                ₹{(party.summary?.balance_owed || 0).toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Party Payments Section */}
                {party.party_payments && party.party_payments.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mb-8"
                    >
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-green-600" />
                            Payments Received
                        </h2>
                        <div className="space-y-2">
                            {party.party_payments.map((payment) => (
                                <Card key={payment.id} className="border-green-200 bg-green-50/30">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                                    <IndianRupee className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-green-700 text-lg">
                                                        ₹{(payment.amount || 0).toLocaleString()}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {payment.payment_date ? format(new Date(payment.payment_date), 'dd MMM yyyy') : '-'}
                                                        {payment.payment_method && (
                                                            <span className="ml-2 px-2 py-0.5 bg-white rounded text-slate-600 text-xs">
                                                                {payment.payment_method}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {payment.notes && (
                                                    <p className="text-sm text-slate-500 italic max-w-[250px] truncate hidden sm:block">
                                                        {payment.notes}
                                                    </p>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                                                    onClick={() => handleDeletePartyPayment(payment.id)}
                                                    disabled={deletePartyPaymentMutation.isPending}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Transaction History */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Transaction History</h2>

                    {party.transactions?.length === 0 ? (
                        <Card className="p-8 text-center text-slate-500">
                            No transactions found for this party.
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {party.transactions?.map((transaction, index) => (
                                <Card key={transaction.id} className="overflow-hidden">
                                    <div
                                        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => setExpandedTransaction(
                                            expandedTransaction === transaction.id ? null : transaction.id
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${transaction.type === 'buy'
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-green-100 text-green-600'
                                                    }`}>
                                                    {transaction.type === 'buy' ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={transaction.type === 'buy' ? 'destructive' : 'default'} className="text-xs">
                                                            {transaction.type === 'buy' ? 'BUY' : 'SELL'}
                                                        </Badge>
                                                        {transaction.sell_items?.[0]?.item_name && (
                                                            <span className="text-sm font-medium text-purple-700">
                                                                {transaction.sell_items[0].item_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {transaction.date ? format(new Date(transaction.date), 'dd MMM yyyy') : '-'}
                                                        {transaction.type === 'sell' && transaction.sell_items?.[0] && (
                                                            <span className="text-slate-400">
                                                                • {transaction.sell_items[0].count} items × ₹{transaction.sell_items[0].rate_per_item}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-800">
                                                        ₹{(transaction.total_payment || 0).toLocaleString()}
                                                    </p>
                                                    {transaction.type === 'sell' && transaction.sell_items?.[0] && (
                                                        <p className={`text-xs ${transaction.sell_items[0].balance_left > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                                            Balance: ₹{(transaction.sell_items[0].balance_left || 0).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                                {expandedTransaction === transaction.id
                                                    ? <ChevronUp className="w-5 h-5 text-slate-400" />
                                                    : <ChevronDown className="w-5 h-5 text-slate-400" />
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Payment Details */}
                                    <AnimatePresence>
                                        {expandedTransaction === transaction.id && transaction.type === 'sell' && transaction.sell_items?.[0] && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-slate-100 bg-slate-50/50"
                                            >
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                            <IndianRupee className="w-4 h-4" />
                                                            Payments Received
                                                        </h4>
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRecordPayment(transaction.sell_items[0]);
                                                            }}
                                                            className="bg-green-600 hover:bg-green-700"
                                                        >
                                                            <Plus className="w-4 h-4 mr-1" />
                                                            Record Payment
                                                        </Button>
                                                    </div>

                                                    {transaction.sell_items[0].payments?.length === 0 ? (
                                                        <p className="text-sm text-slate-500 italic">No payments recorded yet.</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {transaction.sell_items[0].payments?.map((payment) => (
                                                                <div
                                                                    key={payment.id}
                                                                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                                            <IndianRupee className="w-4 h-4 text-green-600" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-semibold text-green-700">
                                                                                ₹{(payment.amount || 0).toLocaleString()}
                                                                            </p>
                                                                            <p className="text-xs text-slate-500">
                                                                                {payment.payment_date ? format(new Date(payment.payment_date), 'dd MMM yyyy') : '-'}
                                                                                {payment.payment_method && (
                                                                                    <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                                                                                        {payment.payment_method}
                                                                                    </span>
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    {payment.notes && (
                                                                        <p className="text-xs text-slate-500 italic max-w-[200px] truncate">
                                                                            {payment.notes}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Summary */}
                                                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-sm">
                                                        <span className="text-slate-600">Total Received:</span>
                                                        <span className="font-bold text-green-700">
                                                            ₹{(transaction.sell_items[0].payment_received || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-600">Balance Left:</span>
                                                        <span className={`font-bold ${transaction.sell_items[0].balance_left > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                                            ₹{(transaction.sell_items[0].balance_left || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Record Payment Dialog */}
                <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <IndianRupee className="w-5 h-5 text-green-600" />
                                Record Payment
                            </DialogTitle>
                        </DialogHeader>

                        {selectedSellItem && (
                            <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm">
                                <p className="text-slate-600">Recording payment for:</p>
                                <p className="font-semibold text-slate-800">{selectedSellItem.item_name}</p>
                                <p className="text-slate-500">
                                    Total: ₹{(selectedSellItem.total_amount || 0).toLocaleString()} |
                                    Balance: ₹{(selectedSellItem.balance_left || 0).toLocaleString()}
                                </p>
                            </div>
                        )}

                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div>
                                <Label className="text-slate-700">Amount (₹) *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter amount"
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    className="mt-1"
                                    required
                                />
                            </div>

                            <div>
                                <Label className="text-slate-700">Payment Date *</Label>
                                <Input
                                    type="date"
                                    value={paymentForm.paymentDate}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                                    className="mt-1"
                                    required
                                />
                            </div>

                            <div>
                                <Label className="text-slate-700">Payment Method</Label>
                                <Select
                                    value={paymentForm.paymentMethod}
                                    onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map(method => (
                                            <SelectItem key={method.value} value={method.value}>
                                                {method.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-slate-700">Notes</Label>
                                <Textarea
                                    placeholder="Optional notes..."
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                    className="mt-1"
                                    rows={2}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={createPaymentMutation.isPending}
                                >
                                    {createPaymentMutation.isPending ? 'Saving...' : 'Save Payment'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Party Payment Dialog */}
                <Dialog open={showPartyPaymentDialog} onOpenChange={setShowPartyPaymentDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <IndianRupee className="w-5 h-5 text-green-600" />
                                Record Payment for {party.name}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Total Selling:</span>
                                <span className="font-semibold">₹{(party.summary?.selling_total || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Already Received:</span>
                                <span className="font-semibold text-green-600">₹{(party.summary?.total_received || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 mt-1">
                                <span className="text-slate-700 font-medium">Balance Due:</span>
                                <span className="font-bold text-orange-600">₹{(party.summary?.balance_owed || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <form onSubmit={handlePartyPaymentSubmit} className="space-y-4">
                            <div>
                                <Label className="text-slate-700">Amount (₹) *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter amount"
                                    value={partyPaymentForm.amount}
                                    onChange={(e) => setPartyPaymentForm({ ...partyPaymentForm, amount: e.target.value })}
                                    className="mt-1"
                                    required
                                />
                            </div>

                            <div>
                                <Label className="text-slate-700">Payment Date *</Label>
                                <Input
                                    type="date"
                                    value={partyPaymentForm.paymentDate}
                                    onChange={(e) => setPartyPaymentForm({ ...partyPaymentForm, paymentDate: e.target.value })}
                                    className="mt-1"
                                    required
                                />
                            </div>

                            <div>
                                <Label className="text-slate-700">Payment Method</Label>
                                <Select
                                    value={partyPaymentForm.paymentMethod}
                                    onValueChange={(v) => setPartyPaymentForm({ ...partyPaymentForm, paymentMethod: v })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map(method => (
                                            <SelectItem key={method.value} value={method.value}>
                                                {method.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-slate-700">Notes</Label>
                                <Textarea
                                    placeholder="e.g., Overall settlement, Advance payment..."
                                    value={partyPaymentForm.notes}
                                    onChange={(e) => setPartyPaymentForm({ ...partyPaymentForm, notes: e.target.value })}
                                    className="mt-1"
                                    rows={2}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowPartyPaymentDialog(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={createPartyPaymentMutation.isPending}
                                >
                                    {createPartyPaymentMutation.isPending ? 'Saving...' : 'Save Payment'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
