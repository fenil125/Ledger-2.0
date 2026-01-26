import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Activity, TrendingUp, ShoppingCart, Search, User, Shield, Clock } from "lucide-react";
import { format, isToday } from "date-fns";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [userFilter, setUserFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date'),
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Get unique users from transactions
  const transactionUsers = useMemo(() => {
    const userSet = new Set(transactions.map(t => t.created_by).filter(Boolean));
    return Array.from(userSet);
  }, [transactions]);

  // User stats
  const userStats = useMemo(() => {
    const stats = {};
    transactions.forEach(t => {
      const user = t.created_by || 'Unknown';
      if (!stats[user]) {
        stats[user] = { buying: 0, selling: 0, buyingCount: 0, sellingCount: 0, totalWeight: 0 };
      }
      if (t.transaction_type === 'buying') {
        stats[user].buying += t.total_payment || 0;
        stats[user].buyingCount++;
      } else {
        stats[user].selling += t.total_payment || 0;
        stats[user].sellingCount++;
      }
      stats[user].totalWeight += t.total_weight || 0;
    });

    return Object.entries(stats)
      .map(([email, data]) => ({
        email,
        ...data,
        total: data.buying + data.selling,
        transactions: data.buyingCount + data.sellingCount
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  // User activity chart data
  const userActivityData = userStats.slice(0, 6).map(u => ({
    name: u.email.split('@')[0],
    buying: u.buying,
    selling: u.selling
  }));

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (userFilter !== 'all') {
      filtered = filtered.filter(t => t.created_by === userFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.party_name?.toLowerCase().includes(search) ||
        t.phone?.includes(search) ||
        t.created_by?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [transactions, userFilter, searchTerm]);

  // Overall stats
  const overallStats = {
    totalUsers: transactionUsers.length,
    totalTransactions: transactions.length,
    totalBuying: transactions.filter(t => t.transaction_type === 'buying').reduce((sum, t) => sum + (t.total_payment || 0), 0),
    totalSelling: transactions.filter(t => t.transaction_type === 'selling').reduce((sum, t) => sum + (t.total_payment || 0), 0),
    totalParties: parties.length,
    todayTransactions: transactions.filter(t => t.date && isToday(new Date(t.date))).length
  };

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <Card className="w-96 bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="pt-6 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-xl font-semibold text-white mb-2">Admin Access Required</h2>
            <p className="text-slate-300">You need administrator privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
          </div>
          <p className="text-slate-400">Monitor all user activities and transactions</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase">Active Users</p>
                    <p className="text-2xl font-bold text-white mt-1">{overallStats.totalUsers}</p>
                  </div>
                  <div className="p-3 bg-indigo-500/20 rounded-xl">
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase">Total Transactions</p>
                    <p className="text-2xl font-bold text-white mt-1">{overallStats.totalTransactions}</p>
                    <p className="text-xs text-slate-500 mt-1">{overallStats.todayTransactions} today</p>
                  </div>
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <Activity className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-red-400 uppercase">Total Buying</p>
                    <p className="text-2xl font-bold text-white mt-1">₹{(overallStats.totalBuying / 100000).toFixed(1)}L</p>
                  </div>
                  <div className="p-3 bg-red-500/20 rounded-xl">
                    <ShoppingCart className="w-5 h-5 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-400 uppercase">Total Selling</p>
                    <p className="text-2xl font-bold text-white mt-1">₹{(overallStats.totalSelling / 100000).toFixed(1)}L</p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Activity Chart */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur lg:col-span-2">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white text-lg">User Activity Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userActivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#f8fafc' }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Bar dataKey="buying" name="Buying" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="selling" name="Selling" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* User Stats */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white text-lg">User Performance</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {userStats.map((user, index) => (
                  <div key={user.email} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                      {user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.email.split('@')[0]}</p>
                      <p className="text-xs text-slate-400">{user.transactions} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">₹{(user.total / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & All Transactions */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="border-b border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                All Transactions
              </CardTitle>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 w-48"
                  />
                </div>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-48 bg-slate-700/50 border-slate-600 text-white">
                    <User className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {transactionUsers.map(user => (
                      <SelectItem key={user} value={user}>{user.split('@')[0]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/30">
                    <TableHead className="text-slate-400">Date</TableHead>
                    <TableHead className="text-slate-400">User</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">Party</TableHead>
                    <TableHead className="text-slate-400">Weight</TableHead>
                    <TableHead className="text-slate-400">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.slice(0, 20).map((tx) => (
                    <TableRow key={tx.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="text-slate-300">
                        {tx.date ? format(new Date(tx.date), 'dd MMM yy') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center">
                            <User className="w-3 h-3 text-indigo-400" />
                          </div>
                          <span className="text-slate-300 text-sm truncate max-w-[120px]">
                            {tx.created_by?.split('@')[0] || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={tx.transaction_type === 'buying' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                          {tx.transaction_type === 'buying' ? 'Buy' : 'Sell'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">{tx.party_name || '-'}</TableCell>
                      <TableCell className="text-slate-300">{tx.total_weight || 0} kg</TableCell>
                      <TableCell className="text-white font-medium">₹{(tx.total_payment || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}