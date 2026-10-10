import React, { useState } from 'react';
import { X, Plus, Sparkles, Loader2, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateHouseholdModal: React.FC<CreateHouseholdModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateRandomCode = () => {
    const prefixes = ['HOUSE', 'HOME', 'NEST', 'VILLA', 'LOFT', 'SUITE'];
    const randPre = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    setInviteCode(`${randPre}-${randSuffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a household name.');
      return;
    }

    setLoading(true);
    setError(null);

    const client = supabase;
    if (!client) {
      setError('Database client is not available.');
      setLoading(false);
      return;
    }

    try {
      const codeToUse = inviteCode.trim() || `HOUSE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data: newHouse, error: houseErr } = await client
        .from('households')
        .insert([
          {
            name: name.trim(),
            currency,
            invite_code: codeToUse,
            admin_payment_info: { iban: '', revolut: '', bizum: '', notes: '' },
            webhook_settings: { discord_url: '', notify_on_new_bill: true, notify_on_payment: true },
          },
        ])
        .select()
        .single();

      if (houseErr) throw houseErr;

      // Seed standard bill categories for the new household
      if (newHouse?.id) {
        await client.from('bill_categories').insert([
          { household_id: newHouse.id, name: 'Rent', code: 'rent', icon: 'home', color_hex: '#6366f1' },
          { household_id: newHouse.id, name: 'Electricity', code: 'electricity', icon: 'zap', color_hex: '#f59e0b' },
          { household_id: newHouse.id, name: 'Water', code: 'water', icon: 'droplet', color_hex: '#3b82f6' },
          { household_id: newHouse.id, name: 'Internet', code: 'internet', icon: 'wifi', color_hex: '#8b5cf6' },
          { household_id: newHouse.id, name: 'Gas', code: 'gas', icon: 'flame', color_hex: '#ef4444' },
        ]);
      }

      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create household';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Create New Household</h2>
              <p className="text-xs text-zinc-400">Add an independent home to the system</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Household Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunset Villa, Apt 4B"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="BRL">BRL (R$)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">Invite Code</label>
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3" /> Auto
                </button>
              </div>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="HOUSE-XXXX"
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm font-mono focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Create Household
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
