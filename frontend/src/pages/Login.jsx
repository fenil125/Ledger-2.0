import React, { useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Chrome, ShieldCheck, TrendingUp, Users } from "lucide-react";

export default function Login() {
  const handleGoogleLogin = () => {
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    // Helpful debug log to confirm which backend URL will be used for OAuth
    // (prints in browser console; safe for production)
    // eslint-disable-next-line no-console
    console.info('[Auth] Redirecting to OAuth start:', `${api}/auth/google`);
    window.location.href = `${api}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 shadow-2xl border-0">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to Ledger</h1>
            <p className="text-slate-500">Manage your business transactions efficiently</p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-green-600" />
              </div>
              <span>Secure authentication with Google</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <span>Track parties and transactions</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <span>Generate detailed reports</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-white hover:bg-gray-50 text-slate-700 border-2 border-slate-200 h-12 text-base font-medium shadow-sm"
          >
            <Chrome className="w-5 h-5 mr-3" />
            Continue with Google
          </Button>

          <p className="text-xs text-center text-slate-400 mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          © 2025 Ledger. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
