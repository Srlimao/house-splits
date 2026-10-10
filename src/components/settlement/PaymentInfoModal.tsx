import React, { useState } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { formatCurrency } from '../../lib/splitCalculator';
import { X, Copy, Check, CreditCard, Shield, Send, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PaymentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentInfoModal: React.FC<PaymentInfoModalProps> = ({ isOpen, onClose }) => {
  const { household, profiles, bills, activeProfile, markSplitPaidToAdmin } = useHousehold();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const adminProfile = profiles.find((p) => p.role === 'admin') || profiles[0];
  const adminPay = household.adminPaymentInfo;

  // Calculate this member's total unpaid amount
  let totalPending = 0;
  const unpaidSplits: { billId: string; amount: number; provider: string }[] = [];

  bills.forEach((b) => {
    b.splits.forEach((s) => {
      if (s.profileId === activeProfile.id && s.status === 'pending') {
        totalPending += s.amountDue;
        unpaidSplits.push({ billId: b.id, amount: s.amountDue, provider: b.providerName });
      }
    });
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleMarkAllSent = () => {
    unpaidSplits.forEach((item) => {
      markSplitPaidToAdmin(item.billId, activeProfile.id, 'Sent via Bank / Revolut');
    });

    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={adminProfile.avatarUrl}
                alt={adminProfile.fullName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-500/40"
              />
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-black rounded-full p-0.5">
                <Shield className="w-3 h-3" />
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pay House Admin</h3>
              <p className="text-xs text-zinc-400">Transfer your share to {adminProfile.fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Owed Highlight */}
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 block font-medium">Your Pending Balance</span>
            <span className="text-2xl font-black text-white">
              {formatCurrency(totalPending, household.currency)}
            </span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
            {unpaidSplits.length} Pending Bills
          </span>
        </div>

        {/* Payment Methods */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Admin Transfer Accounts
          </span>

          {/* IBAN */}
          {adminPay.iban && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <div>
                <span className="text-[11px] text-zinc-500 font-semibold uppercase block">IBAN Transfer</span>
                <span className="text-xs font-mono text-zinc-200 font-bold">{adminPay.iban}</span>
              </div>
              <button
                onClick={() => handleCopy(adminPay.iban, 'iban')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
              >
                {copiedKey === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'iban' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* Revolut */}
          {adminPay.revolut && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <div>
                <span className="text-[11px] text-zinc-500 font-semibold uppercase block">Revolut Tag</span>
                <span className="text-xs text-zinc-200 font-bold">{adminPay.revolut}</span>
              </div>
              <button
                onClick={() => handleCopy(adminPay.revolut, 'revolut')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
              >
                {copiedKey === 'revolut' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'revolut' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* Bizum */}
          {adminPay.bizum && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <div>
                <span className="text-[11px] text-zinc-500 font-semibold uppercase block">Bizum / Phone</span>
                <span className="text-xs text-zinc-200 font-bold">{adminPay.bizum}</span>
              </div>
              <button
                onClick={() => handleCopy(adminPay.bizum, 'bizum')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
              >
                {copiedKey === 'bizum' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'bizum' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {adminPay.notes && (
            <p className="text-xs text-zinc-400 italic bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/80">
              💬 "{adminPay.notes}"
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
          >
            Close
          </button>

          {unpaidSplits.length > 0 && (
            <button
              onClick={handleMarkAllSent}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-bold text-xs shadow-glow transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Mark {unpaidSplits.length} Bills as Sent to Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
