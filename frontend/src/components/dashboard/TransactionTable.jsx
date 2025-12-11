import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, User, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function TransactionTable({ transactions, onEdit, onDelete, showUser = false }) {
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    
    if (aVal === bVal) return 0;
    
    const comparison = aVal < bVal ? -1 : 1;
    return sortConfig.direction === 'desc' ? -comparison : comparison;
  });

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'desc' 
      ? <ArrowDown className="w-3 h-3 text-blue-600" />
      : <ArrowUp className="w-3 h-3 text-blue-600" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead 
                className="font-semibold text-slate-700 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Date
                  <SortIcon columnKey="date" />
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-slate-700 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('transaction_type')}
              >
                <div className="flex items-center gap-1">
                  Type
                  <SortIcon columnKey="transaction_type" />
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-slate-700 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('party_name')}
              >
                <div className="flex items-center gap-1">
                  Party
                  <SortIcon columnKey="party_name" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-slate-700">Phone</TableHead>
              <TableHead className="font-semibold text-slate-700">Item Details</TableHead>
              <TableHead className="font-semibold text-slate-700">HNY</TableHead>
              <TableHead className="font-semibold text-slate-700">Black</TableHead>
              <TableHead 
                className="font-semibold text-slate-700 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('total_weight')}
              >
                <div className="flex items-center gap-1">
                  Weight
                  <SortIcon columnKey="total_weight" />
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold text-slate-700 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('total_payment')}
              >
                <div className="flex items-center gap-1">
                  Payment
                  <SortIcon columnKey="total_payment" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-slate-700">Pay Due</TableHead>
              <TableHead className="font-semibold text-slate-700">Pay Recv</TableHead>
              <TableHead className="font-semibold text-slate-700">Balance</TableHead>
              <TableHead className="font-semibold text-slate-700">Notes</TableHead>
              {showUser && <TableHead className="font-semibold text-slate-700">Added By</TableHead>}
              <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {sortedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showUser ? 15 : 14} className="text-center py-12 text-slate-500">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                sortedTransactions.map((transaction, index) => (
                  <motion.tr
                    key={transaction.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell className="font-medium text-slate-700">
                      {transaction.date ? format(new Date(transaction.date), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`${
                          transaction.transaction_type === 'buying' 
                            ? 'bg-red-100 text-red-700 hover:bg-red-100' 
                            : 'bg-green-100 text-green-700 hover:bg-green-100'
                        } font-medium`}
                      >
                        {transaction.transaction_type === 'buying' ? 'Buy' : 'Sell'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{transaction.party_name || '-'}</TableCell>
                    <TableCell className="text-slate-600">{transaction.phone || '-'}</TableCell>
                    <TableCell>
                      {transaction.transaction_type === 'selling' && transaction.sell_items?.[0] ? (
                        <div className="text-xs space-y-0.5">
                          <div className="font-medium text-purple-700">{transaction.sell_items[0].item_name}</div>
                          <div className="text-slate-600">Qty: {transaction.sell_items[0].count} × ₹{transaction.sell_items[0].rate_per_item}/item</div>
                          <div className="text-slate-500">{transaction.sell_items[0].weight_per_item}kg/item</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.transaction_type === 'buying' ? (
                        <div className="text-xs space-y-0.5">
                          <div className="text-amber-600">R: ₹{transaction.hny_rate || 0}</div>
                          <div className="text-slate-600">W: {transaction.hny_weight || 0}kg</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.transaction_type === 'buying' ? (
                        <div className="text-xs space-y-0.5">
                          <div className="text-slate-800">R: ₹{transaction.black_rate || 0}</div>
                          <div className="text-slate-600">W: {transaction.black_weight || 0}kg</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-indigo-600">
                      {transaction.transaction_type === 'selling' && transaction.sell_items?.[0] ? (
                        <div className="text-xs">
                          <div className="font-bold text-indigo-600">{transaction.total_weight || 0} kg</div>
                          <div className="text-slate-500">({transaction.sell_items[0].count} × {transaction.sell_items[0].weight_per_item})</div>
                        </div>
                      ) : (
                        <div>{transaction.total_weight || 0} kg</div>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">
                      ₹{(transaction.total_payment || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {transaction.transaction_type === 'selling' && transaction.sell_items?.[0] ? (
                        transaction.sell_items[0].payment_due_days ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md font-medium">
                            {transaction.sell_items[0].payment_due_days} days
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {transaction.transaction_type === 'selling' && transaction.sell_items?.[0] ? (
                        <span className="font-semibold text-green-700">
                          ₹{(transaction.sell_items[0].payment_received || 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {transaction.transaction_type === 'selling' && transaction.sell_items?.[0] ? (
                        <span className={`font-bold ${transaction.sell_items[0].balance_left > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{(transaction.sell_items[0].balance_left || 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm max-w-[200px] truncate">
                      {transaction.notes || '-'}
                    </TableCell>
                    {showUser && (
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="w-3 h-3 text-indigo-600" />
                          </div>
                          <span className="text-xs text-slate-600 truncate max-w-[100px]">
                            {transaction.created_by || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() => onEdit(transaction)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => onDelete(transaction)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}