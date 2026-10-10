import React, { useState } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { SlidersHorizontal, Check, RefreshCw, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SplitRulesManager: React.FC = () => {
  const { categories, profiles, splitRules, updateSplitRules } = useHousehold();
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Get current rules for selected category
  const activeCategory = categories.find((c) => c.id === selectedCatId) || categories[0];
  const currentRules = splitRules.filter((r) => r.categoryId === selectedCatId);

  // Local state for editing percentages
  const [percentages, setPercentages] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      const existing = currentRules.find((r) => r.profileId === p.id);
      map[p.id] = existing ? existing.defaultPercentage : Number((100 / profiles.length).toFixed(2));
    });
    return map;
  });

  // Keep in sync when category changes
  const handleCategoryChange = (catId: string) => {
    setSelectedCatId(catId);
    const catRules = splitRules.filter((r) => r.categoryId === catId);
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      const existing = catRules.find((r) => r.profileId === p.id);
      map[p.id] = existing ? existing.defaultPercentage : Number((100 / profiles.length).toFixed(2));
    });
    setPercentages(map);
    setSaveSuccess(false);
  };

  const handlePercentageChange = (profileId: string, val: number) => {
    setPercentages((prev) => ({ ...prev, [profileId]: Number(val) }));
    setSaveSuccess(false);
  };

  const setEqualSplit = () => {
    const equalVal = Number((100 / profiles.length).toFixed(2));
    const remainder = Number((100 - equalVal * profiles.length).toFixed(2));
    const map: Record<string, number> = {};
    profiles.forEach((p, idx) => {
      map[p.id] = idx === 0 ? Number((equalVal + remainder).toFixed(2)) : equalVal;
    });
    setPercentages(map);
    setSaveSuccess(false);
  };

  const setRentPreset = () => {
    // 50% Will, 25% Alex, 25% Sam
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      if (p.role === 'admin' || p.id === 'user-admin') {
        map[p.id] = 50.0;
      } else {
        map[p.id] = 25.0;
      }
    });
    setPercentages(map);
    setSaveSuccess(false);
  };

  const totalPercentage = Object.values(percentages).reduce((a, b) => a + b, 0);
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.05;

  const handleSave = () => {
    if (!isValidTotal) return;
    const updatedShares = profiles.map((p) => ({
      profileId: p.id,
      percentage: percentages[p.id] || 0,
    }));
    updateSplitRules(selectedCatId, updatedShares);
    setSaveSuccess(true);
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="rounded-2xl p-6 bg-zinc-900/60 border border-zinc-800/80 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <SlidersHorizontal className="w-5 h-5" />
          </span>
          <h3 className="text-lg font-bold text-white">Default Category Split Rules</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Configure default percentages for each utility and house payment. These rules auto-populate whenever a new bill is scanned.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCategoryChange(c.id)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCatId === c.id
                ? 'bg-brand-500 text-black shadow-glow'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Quick Action Presets */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500 font-medium">Quick Presets:</span>
        <button
          onClick={setEqualSplit}
          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium border border-zinc-700/60 transition-colors"
        >
          Equal 3-Way Split (33.3% each)
        </button>
        <button
          onClick={setRentPreset}
          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium border border-zinc-700/60 transition-colors"
        >
          Rent Split (50% Admin, 25% Couple each)
        </button>
      </div>

      {/* Sliders & Percentage Inputs */}
      <div className="space-y-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
        {profiles.map((p) => {
          const val = percentages[p.id] ?? 0;
          return (
            <div key={p.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <img src={p.avatarUrl} alt={p.fullName} className="w-5 h-5 rounded-full object-cover" />
                  <span className="font-semibold text-zinc-200">
                    {p.fullName} {p.role === 'admin' ? '(Admin)' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={val}
                    onChange={(e) => handlePercentageChange(p.id, Number(e.target.value))}
                    className="w-16 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-center text-xs font-bold text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-zinc-500 font-bold">%</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={val}
                onChange={(e) => handlePercentageChange(p.id, Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      {/* Status & Save Button */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {!isValidTotal ? (
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>Total must be 100% (currently {totalPercentage.toFixed(1)}%)</span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" />
              <span>Valid 100.0% Allocation</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-400 animate-fade-in">
              Rules saved successfully!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!isValidTotal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs shadow-glow transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Save Split Rules for {activeCategory.name}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
