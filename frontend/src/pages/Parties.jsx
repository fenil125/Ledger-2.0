import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, Mail, MapPin, Pencil, Trash2, User, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Parties() {
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [deleteParty, setDeleteParty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list('-created_date'),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Party.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['parties']);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Party.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['parties']);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Party.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['parties']);
      setDeleteParty(null);
    },
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingParty(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      is_active: true
    });
  };

  const handleEdit = (party) => {
    setEditingParty(party);
    setFormData({
      name: party.name || '',
      phone: party.phone || '',
      email: party.email || '',
      address: party.address || '',
      notes: party.notes || '',
      is_active: party.is_active !== false
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingParty) {
      updateMutation.mutate({ id: editingParty.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getPartyStats = (partyName) => {
    const partyTx = transactions.filter(t => t.party_name === partyName);
    const buying = partyTx.filter(t => t.transaction_type === 'buying').reduce((sum, t) => sum + (t.total_payment || 0), 0);
    const selling = partyTx.filter(t => t.transaction_type === 'selling').reduce((sum, t) => sum + (t.total_payment || 0), 0);
    return { buying, selling, count: partyTx.length };
  };

  const filteredParties = parties.filter(party =>
    party.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    party.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Parties</h1>
            <p className="text-slate-500 mt-1">Manage your contacts and phone book</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Party
          </Button>
        </motion.div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search parties by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-slate-200 max-w-md"
          />
        </div>

        {/* Parties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredParties.map((party, index) => {
              const stats = getPartyStats(party.name);
              return (
                <motion.div
                  key={party.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="group hover:shadow-lg transition-all duration-300 border-slate-200 cursor-pointer"
                    onClick={() => navigate(`/parties/${party.id}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {party.name?.[0]?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">{party.name}</h3>
                            <Badge variant={party.is_active !== false ? 'default' : 'secondary'} className="mt-1 text-xs">
                              {party.is_active !== false ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                            onClick={(e) => { e.stopPropagation(); handleEdit(party); }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); setDeleteParty(party); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {party.phone && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {party.phone}
                          </div>
                        )}
                        {party.email && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {party.email}
                          </div>
                        )}
                        {party.address && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="truncate">{party.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-slate-500">Transactions</p>
                          <p className="font-semibold text-slate-700">{stats.count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-red-500">Buying</p>
                          <p className="font-semibold text-red-600">₹{(stats.buying / 1000).toFixed(0)}k</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-500">Selling</p>
                          <p className="font-semibold text-green-600">₹{(stats.selling / 1000).toFixed(0)}k</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredParties.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No parties found</p>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingParty ? 'Edit Party' : 'Add New Party'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Party name"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Email address"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Address"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  {editingParty ? 'Update' : 'Add'} Party
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteParty} onOpenChange={() => setDeleteParty(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Party</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteParty?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteParty.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}