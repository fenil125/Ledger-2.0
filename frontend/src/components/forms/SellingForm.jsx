import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Calculator } from "lucide-react";

const ITEM_NAMES = [
  "Shoes HNY", "Shoes Black", "Sheet HNY", "Sheet Black", 
  "Mixed Lot", "Premium Grade", "Standard Grade", "Reject"
];

export default function SellingForm({ transaction, parties, onSubmit, isLoading }) {
  const [itemInputMode, setItemInputMode] = useState('dropdown'); // 'dropdown' or 'manual'
  const [formData, setFormData] = useState({
    transaction_type: 'selling',
    date: new Date().toISOString().split('T')[0],
    phone: '',
    party_name: '',
    item_name: '',
    count: '',
    weight_per_item: '',
    rate_per_item: '',
    payment_due_days: '',
    payment_received: 0,
    balance_left: 0,
    total_weight: 0,
    total_payment: 0,
    notes: ''
  });

  useEffect(() => {
    if (transaction) {
      const sellItem = transaction.sell_items?.[0];
      setFormData({
        transaction_type: 'selling',
        date: transaction.date || new Date().toISOString().split('T')[0],
        phone: transaction.phone || '',
        party_name: transaction.party_name || '',
        item_name: sellItem?.item_name || '',
        count: sellItem?.count || '',
        weight_per_item: sellItem?.weight_per_item || '',
        rate_per_item: sellItem?.rate_per_item || '',
        payment_due_days: sellItem?.payment_due_days || '',
        payment_received: sellItem?.payment_received || 0,
        balance_left: sellItem?.balance_left || 0,
        total_weight: transaction.total_weight || 0,
        total_payment: transaction.total_payment || 0,
        notes: transaction.notes || ''
      });
    }
  }, [transaction]);

  // Auto-calculate totals when count, weight_per_item, or rate_per_item changes
  useEffect(() => {
    const count = parseFloat(formData.count) || 0;
    const weightPerItem = parseFloat(formData.weight_per_item) || 0;
    const ratePerItem = parseFloat(formData.rate_per_item) || 0;

    const totalWeight = count * weightPerItem;
    const totalPayment = count * ratePerItem;

    setFormData(prev => ({
      ...prev,
      total_weight: totalWeight,
      total_payment: totalPayment
    }));
  }, [formData.count, formData.weight_per_item, formData.rate_per_item]);

  // Auto-calculate balance left when total_payment or payment_received changes
  useEffect(() => {
    const totalPayment = parseFloat(formData.total_payment) || 0;
    const paymentReceived = parseFloat(formData.payment_received) || 0;
    const balanceLeft = totalPayment - paymentReceived;

    setFormData(prev => ({
      ...prev,
      balance_left: balanceLeft
    }));
  }, [formData.total_payment, formData.payment_received]);

  const handlePartySelect = (partyName) => {
    const party = parties.find(p => p.name === partyName);
    setFormData(prev => ({
      ...prev,
      party_name: partyName,
      phone: party?.phone || prev.phone
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      count: parseFloat(formData.count) || 0,
      weight_per_item: parseFloat(formData.weight_per_item) || 0,
      rate_per_item: parseFloat(formData.rate_per_item) || 0,
      payment_due_days: formData.payment_due_days ? parseInt(formData.payment_due_days) : null,
      payment_received: parseFloat(formData.payment_received) || 0,
      balance_left: parseFloat(formData.balance_left) || 0,
      total_weight: parseFloat(formData.total_weight) || 0,
      total_payment: parseFloat(formData.total_payment) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-600">Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-slate-600">Party Name</Label>
              <Select value={formData.party_name} onValueChange={handlePartySelect}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select party" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map(party => (
                    <SelectItem key={party.id} value={party.name}>{party.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or enter new party name"
                value={formData.party_name}
                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label className="text-slate-600">Phone</Label>
              <Input
                placeholder="Phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Item Details */}
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-purple-700">Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-purple-600">Item Name</Label>
              <Select 
                value={itemInputMode === 'dropdown' ? formData.item_name : ''} 
                onValueChange={(v) => {
                  setItemInputMode('dropdown');
                  setFormData({ ...formData, item_name: v });
                }}
              >
                <SelectTrigger className="mt-1 bg-white">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_NAMES.map(item => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or enter new item name"
                value={itemInputMode === 'manual' ? formData.item_name : ''}
                onChange={(e) => {
                  setItemInputMode('manual');
                  setFormData({ ...formData, item_name: e.target.value });
                }}
                className="mt-2 bg-white"
                required
              />
            </div>
            <div>
              <Label className="text-purple-600">Count (Number of Items)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 50"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                className="mt-1 bg-white"
                required
              />
            </div>
            <div>
              <Label className="text-purple-600">Weight per Item (kg)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 0.8"
                value={formData.weight_per_item}
                onChange={(e) => setFormData({ ...formData, weight_per_item: e.target.value })}
                className="mt-1 bg-white"
                required
              />
            </div>
            <div>
              <Label className="text-purple-600">Rate (₹/item)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 140"
                value={formData.rate_per_item}
                onChange={(e) => setFormData({ ...formData, rate_per_item: e.target.value })}
                className="mt-1 bg-white"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-blue-700">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-blue-600">Payment Due (In Days)</Label>
              <Input
                type="number"
                placeholder="e.g., 30 (optional)"
                value={formData.payment_due_days}
                onChange={(e) => setFormData({ ...formData, payment_due_days: e.target.value })}
                className="mt-1 bg-white"
              />
              <p className="text-xs text-slate-500 mt-1">Number of days until payment is due</p>
            </div>
            <div>
              <Label className="text-blue-600">Payment Received (Credit)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 5000"
                value={formData.payment_received}
                onChange={(e) => setFormData({ ...formData, payment_received: e.target.value })}
                className="mt-1 bg-white"
              />
              <p className="text-xs text-slate-500 mt-1">Amount already received/credited</p>
            </div>
            <div className="pt-2 border-t border-blue-200">
              <p className="text-sm text-blue-600">Balance Left</p>
              <p className="text-2xl font-bold text-blue-700">
                ₹{formData.balance_left.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Total Payment - Payment Received
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculated Totals */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-green-700 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Calculated Totals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border border-green-100">
              <p className="text-sm text-green-600">Total Weight</p>
              <p className="text-2xl font-bold text-green-700">{formData.total_weight.toFixed(2)} kg</p>
              <p className="text-xs text-slate-500 mt-1">
                {formData.count} × {formData.weight_per_item} kg
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-green-100">
              <p className="text-sm text-green-600">Total Payment</p>
              <p className="text-2xl font-bold text-green-700">₹{formData.total_payment.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">
                {formData.count} items × ₹{formData.rate_per_item}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-green-100">
              <Label className="text-slate-600 text-sm">Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 bg-white min-h-[60px]"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 px-8"
        >
          <Save className="w-4 h-4 mr-2" />
          {transaction ? 'Update' : 'Save'} Transaction
        </Button>
      </div>
    </form>
  );
}