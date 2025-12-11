import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, ShoppingBag, Calculator, Users, Activity, Award } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Reports() {
  const [buyExportLimit, setBuyExportLimit] = useState('100');
  const [sellExportLimit, setSellExportLimit] = useState('100');

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date'),
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['parties'],
    queryFn: () => base44.entities.Party.list(),
  });

  // Separate buying and selling transactions
  const buyingTransactions = useMemo(() => 
    transactions.filter(t => t.transaction_type === 'buying').slice(0, 10),
    [transactions]
  );

  const sellingTransactions = useMemo(() => 
    transactions.filter(t => t.transaction_type === 'selling').slice(0, 10),
    [transactions]
  );

  // Calculate KPIs
  const kpis = useMemo(() => {
    const allBuying = transactions.filter(t => t.transaction_type === 'buying');
    const allSelling = transactions.filter(t => t.transaction_type === 'selling');
    
    const totalBuyAmount = allBuying.reduce((sum, t) => sum + (t.total_payment || 0), 0);
    const totalSellAmount = allSelling.reduce((sum, t) => sum + (t.total_payment || 0), 0);
    
    const totalBuyWeight = allBuying.reduce((sum, t) => sum + (t.total_weight || 0), 0);
    const totalSellWeight = allSelling.reduce((sum, t) => sum + (t.total_weight || 0), 0);
    
    const netProfit = totalSellAmount - totalBuyAmount;
    const avgBuyRate = totalBuyWeight > 0 ? totalBuyAmount / totalBuyWeight : 0;
    const avgSellRate = totalSellWeight > 0 ? totalSellAmount / totalSellWeight : 0;
    
    // Top selling items
    const itemRevenue = {};
    allSelling.forEach(t => {
      if (t.sell_items && t.sell_items.length > 0) {
        t.sell_items.forEach(item => {
          const name = item.item_name || 'Unknown';
          if (!itemRevenue[name]) {
            itemRevenue[name] = 0;
          }
          itemRevenue[name] += item.total_amount || 0;
        });
      }
    });
    
    const topItem = Object.entries(itemRevenue)
      .sort(([, a], [, b]) => b - a)[0];
    
    // Top party
    const partyRevenue = {};
    transactions.forEach(t => {
      const party = t.party_name || 'Unknown';
      if (!partyRevenue[party]) {
        partyRevenue[party] = 0;
      }
      partyRevenue[party] += t.total_payment || 0;
    });
    
    const topParty = Object.entries(partyRevenue)
      .sort(([, a], [, b]) => b - a)[0];
    
    const activeParties = new Set(transactions.map(t => t.party_name)).size;
    
    return {
      totalBuyAmount,
      totalSellAmount,
      netProfit,
      totalBuyWeight,
      totalSellWeight,
      totalTransactions: transactions.length,
      avgBuyRate,
      avgSellRate,
      topItem: topItem ? { name: topItem[0], revenue: topItem[1] } : null,
      topParty: topParty ? { name: topParty[0], revenue: topParty[1] } : null,
      activeParties
    };
  }, [transactions]);

  // Export functions
  const exportBuyingCSV = () => {
    const limit = buyExportLimit === 'all' ? transactions.filter(t => t.transaction_type === 'buying').length : parseInt(buyExportLimit);
    const data = transactions.filter(t => t.transaction_type === 'buying').slice(0, limit);
    
    const headers = ['#', 'Date', 'Party', 'Phone', 'HNY Rate', 'HNY Weight', 'Black Rate', 'Black Weight', 'Total Weight (kg)', 'Total Payment (₹)', 'Notes', 'Added By'];
    const rows = data.map((t, idx) => [
      idx + 1,
      format(new Date(t.date), 'dd MMM yyyy'),
      t.party_name,
      t.phone,
      `₹${t.hny_rate || 0}`,
      `${t.hny_weight || 0}kg`,
      `₹${t.black_rate || 0}`,
      `${t.black_weight || 0}kg`,
      t.total_weight,
      t.total_payment,
      t.notes || '-',
      t.created_by
    ]);
    
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadCSV(csv, `buying_transactions_top${limit}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success(`Exported top ${limit} buying transactions`);
  };

  const exportSellingCSV = () => {
    const limit = sellExportLimit === 'all' ? transactions.filter(t => t.transaction_type === 'selling').length : parseInt(sellExportLimit);
    const data = transactions.filter(t => t.transaction_type === 'selling').slice(0, limit);
    
    const headers = ['#', 'Date', 'Party', 'Phone', 'Items Summary', 'Total Weight (kg)', 'Total Payment (₹)', 'Payment Due (Days)', 'Payment Received (₹)', 'Balance Left (₹)', 'Notes', 'Added By'];
    const rows = data.map((t, idx) => {
      const itemsSummary = t.sell_items?.map(item => 
        `${item.item_name}: ${item.count} × ${item.weight_per_item}kg = ${item.total_weight}kg → ₹${item.total_amount}`
      ).join('; ') || '-';
      
      const paymentDue = t.sell_items?.[0]?.payment_due_days || '-';
      const paymentReceived = t.sell_items?.[0]?.payment_received || 0;
      const balanceLeft = t.sell_items?.[0]?.balance_left || 0;
      
      return [
        idx + 1,
        format(new Date(t.date), 'dd MMM yyyy'),
        t.party_name,
        t.phone,
        itemsSummary,
        t.total_weight,
        t.total_payment,
        paymentDue,
        paymentReceived,
        balanceLeft,
        t.notes || '-',
        t.created_by
      ];
    });
    
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
    downloadCSV(csv, `selling_transactions_top${limit}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success(`Exported top ${limit} selling transactions`);
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Business Reports</h1>
          <p className="text-slate-600">Key performance indicators and transaction exports</p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          {/* Total Buy Amount */}
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">Total Buy</p>
              <p className="text-2xl font-bold text-red-700">₹{(kpis.totalBuyAmount / 1000).toFixed(1)}k</p>
              <p className="text-xs text-slate-500 mt-1">{kpis.avgBuyRate.toFixed(0)} ₹/kg avg</p>
            </CardContent>
          </Card>

          {/* Total Sell Amount */}
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Total Sell</p>
              <p className="text-2xl font-bold text-green-700">₹{(kpis.totalSellAmount / 1000).toFixed(1)}k</p>
              <p className="text-xs text-slate-500 mt-1">{kpis.avgSellRate.toFixed(0)} ₹/kg avg</p>
            </CardContent>
          </Card>

          {/* Net Profit */}
          <Card className={`border-${kpis.netProfit >= 0 ? 'blue' : 'orange'}-200 bg-gradient-to-br from-${kpis.netProfit >= 0 ? 'blue' : 'orange'}-50 to-white`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 bg-${kpis.netProfit >= 0 ? 'blue' : 'orange'}-100 rounded-lg`}>
                  <Calculator className={`w-5 h-5 text-${kpis.netProfit >= 0 ? 'blue' : 'orange'}-600`} />
                </div>
              </div>
              <p className={`text-xs font-medium text-${kpis.netProfit >= 0 ? 'blue' : 'orange'}-600 uppercase tracking-wide mb-1`}>
                Net {kpis.netProfit >= 0 ? 'Profit' : 'Loss'}
              </p>
              <p className={`text-2xl font-bold text-${kpis.netProfit >= 0 ? 'blue' : 'orange'}-700`}>
                {kpis.netProfit >= 0 ? '+' : ''}₹{(kpis.netProfit / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {kpis.totalBuyAmount > 0 ? ((kpis.netProfit / kpis.totalBuyAmount) * 100).toFixed(1) : 0}% margin
              </p>
            </CardContent>
          </Card>

          {/* Total Buy Weight */}
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Buy Weight</p>
              <p className="text-2xl font-bold text-purple-700">{kpis.totalBuyWeight.toFixed(0)} kg</p>
            </CardContent>
          </Card>

          {/* Total Sell Weight */}
          <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-teal-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-teal-600 uppercase tracking-wide mb-1">Sell Weight</p>
              <p className="text-2xl font-bold text-teal-700">{kpis.totalSellWeight.toFixed(0)} kg</p>
            </CardContent>
          </Card>

          {/* Total Transactions */}
          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Activity className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">Transactions</p>
              <p className="text-2xl font-bold text-indigo-700">{kpis.totalTransactions}</p>
            </CardContent>
          </Card>

          {/* Active Parties */}
          <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Users className="w-5 h-5 text-pink-600" />
                </div>
              </div>
              <p className="text-xs font-medium text-pink-600 uppercase tracking-wide mb-1">Active Parties</p>
              <p className="text-2xl font-bold text-pink-700">{kpis.activeParties}</p>
            </CardContent>
          </Card>

          {/* Top Item */}
          {kpis.topItem && (
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Top Item</p>
                <p className="text-sm font-bold text-amber-700 truncate">{kpis.topItem.name}</p>
                <p className="text-xs text-slate-500 mt-1">₹{(kpis.topItem.revenue / 1000).toFixed(1)}k</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Buying Transactions Table */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <TrendingDown className="w-6 h-6 text-red-600" />
                Buying — Last 10 Transactions
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">Export / Download:</span>
                <Select value={buyExportLimit} onValueChange={setBuyExportLimit}>
                  <SelectTrigger className="w-32 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">Top 100</SelectItem>
                    <SelectItem value="200">Top 200</SelectItem>
                    <SelectItem value="300">Top 300</SelectItem>
                    <SelectItem value="1000">Top 1000</SelectItem>
                    <SelectItem value="2000">Top 2000</SelectItem>
                    <SelectItem value="all">Till Today</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={exportBuyingCSV} size="sm" className="bg-red-600 hover:bg-red-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b-2">
                    <TableHead className="font-bold text-slate-700">#</TableHead>
                    <TableHead className="font-bold text-slate-700">Date</TableHead>
                    <TableHead className="font-bold text-slate-700">Party</TableHead>
                    <TableHead className="font-bold text-slate-700">Phone</TableHead>
                    <TableHead className="font-bold text-slate-700">HNY (Rate / Wt)</TableHead>
                    <TableHead className="font-bold text-slate-700">Black (Rate / Wt)</TableHead>
                    <TableHead className="font-bold text-slate-700">Total Weight (kg)</TableHead>
                    <TableHead className="font-bold text-slate-700">Total Payment (₹)</TableHead>
                    <TableHead className="font-bold text-slate-700">Notes</TableHead>
                    <TableHead className="font-bold text-slate-700">Added By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buyingTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                        No buying transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    buyingTransactions.map((t, idx) => (
                      <TableRow key={t.id} className="hover:bg-red-50/30 transition-colors">
                        <TableCell className="font-medium text-slate-900">{idx + 1}</TableCell>
                        <TableCell className="text-slate-700 whitespace-nowrap">
                          {format(new Date(t.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{t.party_name}</TableCell>
                        <TableCell className="text-slate-600">{t.phone}</TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <div className="text-amber-700">R: ₹{t.hny_rate || 0}</div>
                            <div className="text-slate-600">W: {t.hny_weight || 0}kg</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <div className="text-slate-800">R: ₹{t.black_rate || 0}</div>
                            <div className="text-slate-600">W: {t.black_weight || 0}kg</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">{t.total_weight}</TableCell>
                        <TableCell className="font-bold text-red-700">
                          {t.total_payment.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-slate-600 max-w-xs truncate">
                          {t.notes || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{t.created_by}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Selling Transactions Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                Selling — Last 10 Transactions
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">Export / Download:</span>
                <Select value={sellExportLimit} onValueChange={setSellExportLimit}>
                  <SelectTrigger className="w-32 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">Top 100</SelectItem>
                    <SelectItem value="200">Top 200</SelectItem>
                    <SelectItem value="300">Top 300</SelectItem>
                    <SelectItem value="1000">Top 1000</SelectItem>
                    <SelectItem value="2000">Top 2000</SelectItem>
                    <SelectItem value="all">Till Today</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={exportSellingCSV} size="sm" className="bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b-2">
                    <TableHead className="font-bold text-slate-700">#</TableHead>
                    <TableHead className="font-bold text-slate-700">Date</TableHead>
                    <TableHead className="font-bold text-slate-700">Party</TableHead>
                    <TableHead className="font-bold text-slate-700">Phone</TableHead>
                    <TableHead className="font-bold text-slate-700">Items (summary)</TableHead>
                    <TableHead className="font-bold text-slate-700">Total Weight (kg)</TableHead>
                    <TableHead className="font-bold text-slate-700">Total Payment (₹)</TableHead>
                    <TableHead className="font-bold text-slate-700">Pay Due</TableHead>
                    <TableHead className="font-bold text-slate-700">Pay Recv</TableHead>
                    <TableHead className="font-bold text-slate-700">Balance</TableHead>
                    <TableHead className="font-bold text-slate-700">Notes</TableHead>
                    <TableHead className="font-bold text-slate-700">Added By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellingTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-12 text-slate-500">
                        No selling transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sellingTransactions.map((t, idx) => (
                      <TableRow key={t.id} className="hover:bg-green-50/30 transition-colors">
                        <TableCell className="font-medium text-slate-900">{idx + 1}</TableCell>
                        <TableCell className="text-slate-700 whitespace-nowrap">
                          {format(new Date(t.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{t.party_name}</TableCell>
                        <TableCell className="text-slate-600">{t.phone}</TableCell>
                        <TableCell className="max-w-md">
                          {t.sell_items && t.sell_items.length > 0 ? (
                            <div className="text-xs space-y-1">
                              {t.sell_items.map((item, itemIdx) => (
                                <div key={itemIdx} className="text-slate-700">
                                  <span className="font-semibold text-purple-700">{item.item_name}</span>: {item.count} × {item.weight_per_item}kg = {item.total_weight}kg → ₹{item.total_amount.toLocaleString()}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">{t.total_weight}</TableCell>
                        <TableCell className="font-bold text-green-700">
                          {t.total_payment.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {t.sell_items && t.sell_items.length > 0 && t.sell_items[0].payment_due_days ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-700">
                              {t.sell_items[0].payment_due_days} days
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-green-700 font-medium">
                          {t.sell_items && t.sell_items.length > 0 && t.sell_items[0].payment_received > 0 ? (
                            `₹${t.sell_items[0].payment_received.toLocaleString()}`
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className={`font-semibold ${t.sell_items && t.sell_items.length > 0 && t.sell_items[0].balance_left > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {t.sell_items && t.sell_items.length > 0 ? (
                            `₹${t.sell_items[0].balance_left.toLocaleString()}`
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600 max-w-xs truncate">
                          {t.notes || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{t.created_by}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}