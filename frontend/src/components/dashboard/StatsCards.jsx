import React from 'react';
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Scale, Wallet, Banknote, Receipt } from "lucide-react";
import { motion } from "framer-motion";

export default function StatsCards({ transactions }) {
  const buyingTotal = transactions
    .filter(t => t.transaction_type === 'buying')
    .reduce((sum, t) => sum + (t.total_payment || 0), 0);

  const sellingTotal = transactions
    .filter(t => t.transaction_type === 'selling')
    .reduce((sum, t) => sum + (t.total_payment || 0), 0);

  const totalWeight = transactions
    .reduce((sum, t) => sum + (t.total_weight || 0), 0);

  const balance = sellingTotal - buyingTotal;

  // Calculate total payment received from selling transactions
  const paymentReceived = transactions
    .filter(t => t.transaction_type === 'selling')
    .reduce((sum, t) => {
      const received = t.sell_items?.[0]?.payment_received || 0;
      return sum + received;
    }, 0);

  // Calculate total balance left (pending) from selling transactions
  const balanceLeft = transactions
    .filter(t => t.transaction_type === 'selling')
    .reduce((sum, t) => {
      const left = t.sell_items?.[0]?.balance_left || 0;
      return sum + left;
    }, 0);

  const stats = [
    {
      title: "Total Buying",
      value: `₹${buyingTotal.toLocaleString()}`,
      icon: TrendingDown,
      color: "bg-red-500",
      lightColor: "bg-red-50",
      textColor: "text-red-600"
    },
    {
      title: "Total Selling",
      value: `₹${sellingTotal.toLocaleString()}`,
      icon: TrendingUp,
      color: "bg-green-500",
      lightColor: "bg-green-50",
      textColor: "text-green-600"
    },
    {
      title: "Payment Received",
      value: `₹${paymentReceived.toLocaleString()}`,
      icon: Banknote,
      color: "bg-cyan-500",
      lightColor: "bg-cyan-50",
      textColor: "text-cyan-600"
    },
    {
      title: "Balance Left",
      value: `₹${balanceLeft.toLocaleString()}`,
      icon: Receipt,
      color: balanceLeft > 0 ? "bg-orange-500" : "bg-green-500",
      lightColor: balanceLeft > 0 ? "bg-orange-50" : "bg-green-50",
      textColor: balanceLeft > 0 ? "text-orange-600" : "text-green-600",
      subtitle: balanceLeft > 0 ? "Pending" : "Cleared"
    },
    {
      title: "Total Weight",
      value: `${totalWeight.toLocaleString()} kg`,
      icon: Scale,
      color: "bg-indigo-500",
      lightColor: "bg-indigo-50",
      textColor: "text-indigo-600"
    },
    {
      title: "Balance",
      value: `₹${Math.abs(balance).toLocaleString()}`,
      icon: Wallet,
      color: balance >= 0 ? "bg-emerald-500" : "bg-amber-500",
      lightColor: balance >= 0 ? "bg-emerald-50" : "bg-amber-50",
      textColor: balance >= 0 ? "text-emerald-600" : "text-amber-600",
      subtitle: balance >= 0 ? "Profit" : "Loss"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`p-3 sm:p-4 lg:p-5 ${stat.lightColor} border-0 shadow-sm hover:shadow-md transition-all duration-300`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.title}</p>
                <p className={`text-sm sm:text-lg lg:text-xl font-bold mt-1 ${stat.textColor} break-all`}>{stat.value}</p>
                {stat.subtitle && (
                  <p className={`text-[10px] sm:text-xs mt-1 ${stat.textColor} opacity-70`}>{stat.subtitle}</p>
                )}
              </div>
              <div className={`p-1.5 sm:p-2 lg:p-2.5 rounded-lg sm:rounded-xl ${stat.color} flex-shrink-0`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}