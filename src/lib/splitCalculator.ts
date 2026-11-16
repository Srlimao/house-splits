import { differenceInDays, parseISO } from 'date-fns';

export interface MemberShareInput {
  profileId: string;
  percentage: number;
}

export interface CalculatedShare {
  profileId: string;
  percentage: number;
  amountDue: number; // in standard currency units (e.g. 33.34)
  cents: number;
}

/**
 * Calculates exact-cent split allocations ensuring that the sum of all shares
 * matches the totalAmount down to the last cent.
 *
 * @param totalAmount - The total bill amount (e.g. 100.00)
 * @param shares - Array of { profileId, percentage }
 * @param priorityProfileId - Profile ID that should absorb any rounding remainder cents (usually Admin)
 */
export function calculateExactSplit(
  totalAmount: number,
  shares: MemberShareInput[],
  priorityProfileId?: string
): CalculatedShare[] {
  if (shares.length === 0) {
    return [];
  }

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return shares.map((s) => ({
      profileId: s.profileId,
      percentage: Number.isFinite(s.percentage) ? s.percentage : 0,
      amountDue: 0,
      cents: 0,
    }));
  }

  // Convert total to integer cents to eliminate floating-point arithmetic errors
  const totalCents = Math.round(totalAmount * 100);

  // Normalize percentages if they don't exactly equal 100
  const safeShares = shares.map((s) => ({
    ...s,
    percentage: Number.isFinite(s.percentage) && s.percentage >= 0 ? s.percentage : 0,
  }));
  const sumPercent = safeShares.reduce((acc, curr) => acc + curr.percentage, 0);
  const normalizedShares = safeShares.map((s) => ({
    ...s,
    normalizedPct: sumPercent > 0 ? (s.percentage / sumPercent) * 100 : 100 / safeShares.length,
  }));

  // Initial floor calculation for each member
  let allocatedCents = 0;
  const initialCalculations = normalizedShares.map((share) => {
    // Floor calculation
    const shareCents = Math.floor((totalCents * share.normalizedPct) / 100);
    allocatedCents += shareCents;
    return {
      profileId: share.profileId,
      percentage: share.percentage,
      cents: shareCents,
    };
  });

  // Calculate remainder cents (usually 1 or 2 cents)
  let remainderCents = totalCents - allocatedCents;

  // Determine who gets remainder cents:
  // If priorityProfileId is in the list, give to it first; otherwise give to highest percentage
  const sortedForRemainder = [...initialCalculations].sort((a, b) => {
    if (priorityProfileId) {
      if (a.profileId === priorityProfileId) return -1;
      if (b.profileId === priorityProfileId) return 1;
    }
    return b.percentage - a.percentage;
  });

  const bonusMap = new Map<string, number>();
  let idx = 0;
  while (remainderCents > 0 && sortedForRemainder.length > 0) {
    const target = sortedForRemainder[idx % sortedForRemainder.length];
    bonusMap.set(target.profileId, (bonusMap.get(target.profileId) || 0) + 1);
    remainderCents--;
    idx++;
  }

  // Format final shares
  return initialCalculations.map((item) => {
    const finalCents = item.cents + (bonusMap.get(item.profileId) || 0);
    return {
      profileId: item.profileId,
      percentage: item.percentage,
      cents: finalCents,
      amountDue: Number((finalCents / 100).toFixed(2)),
    };
  });
}

/**
 * Returns a display currency symbol for a currency code.
 */
export function getCurrencySymbol(currency?: string): string {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    BRL: 'R$',
  };
  const safeCurrency = currency || 'EUR';
  return symbols[safeCurrency] || safeCurrency;
}

/**
 * Format currency amount with symbol safely against null/NaN values.
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  const num = Number(amount);
  const safeAmount = Number.isFinite(num) ? num : 0;
  const symbol = getCurrencySymbol(currency || 'EUR');
  return `${symbol}${safeAmount.toFixed(2)}`;
}

/**
 * Returns today's date in YYYY-MM-DD format.
 */
export function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Safely picks a reference date string from a bill.
 */
export function getBillReferenceDate(bill: {
  dueDate?: string;
  issueDate?: string;
  createdAt?: string;
}): string {
  return bill?.dueDate || bill?.issueDate || bill?.createdAt || '';
}

/**
 * Computes days until due date, returning null if the date is missing or invalid.
 */
export function getDaysUntilDue(dueDate?: string): number | null {
  if (!dueDate) return null;
  try {
    const parsed = parseISO(dueDate);
    if (Number.isNaN(parsed.getTime())) return null;
    const days = differenceInDays(parsed, new Date());
    return Number.isFinite(days) ? days : null;
  } catch {
    return null;
  }
}

/**
 * Formats a YYYY-MM string to a readable month label, guarding invalid strings.
 */
export function formatYearMonthLabel(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return 'Unknown Date';
  }
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown Date';
  }
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}
