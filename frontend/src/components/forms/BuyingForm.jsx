import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Calculator, Plus } from "lucide-react";

export default function BuyingForm({ transaction, parties, onSubmit, isLoading }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    transaction_type: 'buying',
    date: new Date().toISOString().split('T')[0],
    phone: '',
    party_name: '',
    hny_rate: '',
    hny_weight: '',
    black_rate: '',
    black_weight: '',
    transportation_charges: 0,
    total_weight: '',
    total_payment: '',
    notes: ''
  });

  useEffect(() => {
    if (transaction) {
      setFormData(prev => ({
        ...prev,
        ...transaction,
        date: transaction.date || new Date().toISOString().split('T')[0]
      }));
    }
  }, [transaction]);

  // Auto-calculate totals
  useEffect(() => {
    const hnyWeight = parseFloat(formData.hny_weight) || 0;
    const blackWeight = parseFloat(formData.black_weight) || 0;
    const hnyRate = parseFloat(formData.hny_rate) || 0;
    const blackRate = parseFloat(formData.black_rate) || 0;

    const totalWeight = hnyWeight + blackWeight;
    const totalPayment = (hnyWeight * hnyRate) + (blackWeight * blackRate);

    setFormData(prev => ({
      ...prev,
      total_weight: totalWeight,
      total_payment: totalPayment
    }));
  }, [formData.hny_weight, formData.black_weight, formData.hny_rate, formData.black_rate]);

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
      hny_rate: parseFloat(formData.hny_rate) || 0,
      hny_weight: parseFloat(formData.hny_weight) || 0,
      black_rate: parseFloat(formData.black_rate) || 0,
      black_weight: parseFloat(formData.black_weight) || 0,
      transportation_charges: parseFloat(formData.transportation_charges) || 0,
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
              <div className="flex items-center gap-2">
                <Label className="text-slate-600 flex-1">Party Name</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/parties')}
                  className="h-7 px-2"
                  title="Add new party"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Select value={formData.party_name} onValueChange={handlePartySelect}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select or type party name" />
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
              />
            </div>
          </CardContent>
        </Card>

        {/* HNY Color */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-amber-700">HNY (Color)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-amber-600">Rate (₹/kg)</Label>
              <Input
                type="number"
                placeholder="Enter rate"
                value={formData.hny_rate}
                onChange={(e) => setFormData({ ...formData, hny_rate: e.target.value })}
                className="mt-1 bg-white"
              />
            </div>
            <div>
              <Label className="text-amber-600">Weight (kg)</Label>
              <Input
                type="number"
                placeholder="Enter weight"
                value={formData.hny_weight}
                onChange={(e) => setFormData({ ...formData, hny_weight: e.target.value })}
                className="mt-1 bg-white"
              />
            </div>
            <div className="pt-2 border-t border-amber-200">
              <p className="text-sm text-amber-600">Subtotal</p>
              <p className="text-xl font-bold text-amber-700">
                ₹{((parseFloat(formData.hny_rate) || 0) * (parseFloat(formData.hny_weight) || 0)).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Black Color */}
        <Card className="border-slate-300 bg-slate-50/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-700">Black (Color)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-600">Rate (₹/kg)</Label>
              <Input
                type="number"
                placeholder="Enter rate"
                value={formData.black_rate}
                onChange={(e) => setFormData({ ...formData, black_rate: e.target.value })}
                className="mt-1 bg-white"
              />
            </div>
            <div>
              <Label className="text-slate-600">Weight (kg)</Label>
              <Input
                type="number"
                placeholder="Enter weight"
                value={formData.black_weight}
                onChange={(e) => setFormData({ ...formData, black_weight: e.target.value })}
                className="mt-1 bg-white"
              />
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-sm text-slate-600">Subtotal</p>
              <p className="text-xl font-bold text-slate-700">
                ₹{((parseFloat(formData.black_rate) || 0) * (parseFloat(formData.black_weight) || 0)).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-indigo-700 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Calculated Totals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-indigo-100">
                <p className="text-sm text-indigo-600">Total Weight</p>
                <p className="text-2xl font-bold text-indigo-700">{formData.total_weight} kg</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-indigo-100">
                <p className="text-sm text-indigo-600">Base Payment</p>
                <p className="text-2xl font-bold text-indigo-700">₹{formData.total_payment.toLocaleString()}</p>
              </div>
            </div>
            <div>
              <Label className="text-slate-600">Transportation Charges (₹)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 500"
                value={formData.transportation_charges}
                onChange={(e) => setFormData({ ...formData, transportation_charges: e.target.value })}
                className="mt-1 bg-white"
              />
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-emerald-300 ring-2 ring-emerald-200">
              <p className="text-sm text-emerald-600 font-semibold">Total with Transport</p>
              <p className="text-3xl font-bold text-emerald-700">
                ₹{((parseFloat(formData.total_payment) || 0) + (parseFloat(formData.transportation_charges) || 0)).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">Payment + Transportation</p>
            </div>
            <div>
              <Label className="text-slate-600">Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 bg-white"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 px-8"
        >
          <Save className="w-4 h-4 mr-2" />
          {transaction ? 'Update' : 'Save'} Transaction
        </Button>
      </div>
    </form>
  );
}