import {
  Household,
  Profile,
  BillCategory,
  CategorySplitRule,
  Bill,
  BillSplit,
  SplitStatus,
  AdminPaymentInfo,
  WebhookSettings,
} from '../types';
import { INITIAL_HOUSEHOLD } from '../lib/initialData';
import { getTodayIsoDate } from '../lib/splitCalculator';

export const LS_BILLS_KEY = 'housesplits_bills_v1';
export const LS_RULES_KEY = 'housesplits_rules_v1';
export const LS_HOUSE_KEY = 'housesplits_house_v1';

export const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80';

const LEGACY_MOCK_BILL_IDS = new Set([
  'bill-1',
  'bill-2',
  'bill-3',
  'bill-sep-rent',
  'bill-sep-elec',
]);

const LEGACY_MOCK_PROFILE_IDS = new Set(['user-admin', 'mate-1', 'mate-2']);

const VALID_SPLIT_STATUSES = new Set<SplitStatus>([
  'pending',
  'paid_to_admin',
  'confirmed_by_admin',
]);

export function safeGetLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeSetLocalStorage(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`Could not persist ${key} to localStorage:`, err);
    return false;
  }
}

export function safeRemoveLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

/**
 * Strips large inline base64 data URLs before persisting bills to localStorage
 * to prevent QuotaExceededError crashes.
 */
export function saveBillsToCache(bills: Bill[]): void {
  const lightweightBills = bills.map((b) => {
    const isDataPath = typeof b.filePath === 'string' && b.filePath.startsWith('data:');
    return {
      ...b,
      filePath: isDataPath ? undefined : b.filePath,
      fileDataUrl: undefined,
    };
  });

  if (!safeSetLocalStorage(LS_BILLS_KEY, lightweightBills)) {
    safeRemoveLocalStorage(LS_BILLS_KEY);
  }
}

function safeParseJsonObject(val: unknown): Record<string, any> {
  if (!val) return {};
  if (typeof val === 'object' && !Array.isArray(val)) {
    return val as Record<string, any>;
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export function normalizeHousehold(
  raw: any,
  fallback: Household = INITIAL_HOUSEHOLD
): Household {
  const rawPay = safeParseJsonObject(raw?.adminPaymentInfo ?? raw?.admin_payment_info);
  const rawHook = safeParseJsonObject(raw?.webhookSettings ?? raw?.webhook_settings);

  const adminPaymentInfo: AdminPaymentInfo = {
    iban: typeof rawPay.iban === 'string' ? rawPay.iban : fallback.adminPaymentInfo?.iban || '',
    revolut: typeof rawPay.revolut === 'string' ? rawPay.revolut : fallback.adminPaymentInfo?.revolut || '',
    bizum: typeof rawPay.bizum === 'string' ? rawPay.bizum : fallback.adminPaymentInfo?.bizum || '',
    notes: typeof rawPay.notes === 'string' ? rawPay.notes : fallback.adminPaymentInfo?.notes || '',
  };

  const webhookSettings: WebhookSettings = {
    discordUrl:
      typeof rawHook.discordUrl === 'string'
        ? rawHook.discordUrl
        : typeof rawHook.discord_url === 'string'
        ? rawHook.discord_url
        : fallback.webhookSettings?.discordUrl || '',
    telegramBotToken: rawHook.telegramBotToken ?? rawHook.telegram_bot_token,
    telegramChatId: rawHook.telegramChatId ?? rawHook.telegram_chat_id,
    notifyOnNewBill:
      rawHook.notifyOnNewBill ?? rawHook.notify_on_new_bill ?? fallback.webhookSettings?.notifyOnNewBill ?? true,
    notifyOnPayment:
      rawHook.notifyOnPayment ?? rawHook.notify_on_payment ?? fallback.webhookSettings?.notifyOnPayment ?? true,
  };

  return {
    id: raw?.id || fallback.id,
    name: raw?.name || fallback.name,
    currency: raw?.currency || fallback.currency || 'EUR',
    inviteCode: raw?.inviteCode || raw?.invite_code || fallback.inviteCode || 'MAPLE-2026',
    adminPaymentInfo,
    webhookSettings,
    createdAt: raw?.createdAt || raw?.created_at || fallback.createdAt || new Date().toISOString(),
  };
}

export function normalizeBill(raw: any): Bill {
  const billId = String(raw?.id || `bill-${Date.now()}`);
  const createdAt = raw?.createdAt || raw?.created_at || new Date().toISOString();
  const issueDate = raw?.issueDate || raw?.issue_date || undefined;
  const dueDate =
    raw?.dueDate ||
    raw?.due_date ||
    issueDate ||
    (typeof createdAt === 'string' && createdAt.length >= 10 ? createdAt.slice(0, 10) : '') ||
    getTodayIsoDate();

  const rawTotal = Number(raw?.totalAmount ?? raw?.total_amount);
  const totalAmount = Number.isFinite(rawTotal) ? rawTotal : 0;

  const rawFilePath = raw?.filePath || raw?.file_path || raw?.fileDataUrl || undefined;
  const rawSplits = Array.isArray(raw?.splits) ? raw.splits : [];

  const splits: BillSplit[] = rawSplits.map((s: any, idx: number) => {
    const rawPct = Number(s?.percentage);
    const rawAmt = Number(s?.amountDue ?? s?.amount);
    const statusCandidate = s?.status as SplitStatus;
    return {
      id: String(s?.id || `split-${billId}-${s?.profileId || idx}`),
      billId,
      profileId: String(s?.profileId || s?.profile_id || ''),
      percentage: Number.isFinite(rawPct) ? rawPct : 0,
      amountDue: Number.isFinite(rawAmt) ? rawAmt : 0,
      status: VALID_SPLIT_STATUSES.has(statusCandidate) ? statusCandidate : 'pending',
      markedPaidAt: s?.markedPaidAt || s?.paidAt || s?.paid_at || undefined,
      confirmedPaidAt: s?.confirmedPaidAt || s?.confirmedAt || s?.confirmed_at || undefined,
      notes: s?.notes || undefined,
    };
  });

  return {
    id: billId,
    householdId: String(raw?.householdId || raw?.household_id || ''),
    categoryId: String(raw?.categoryId || raw?.category_id || ''),
    providerName: String(raw?.providerName || raw?.provider_name || 'Utility Bill'),
    invoiceNumber: raw?.invoiceNumber || raw?.invoice_number || undefined,
    totalAmount,
    currency: String(raw?.currency || 'EUR'),
    issueDate,
    dueDate,
    periodStart: raw?.periodStart || raw?.period_start || undefined,
    periodEnd: raw?.periodEnd || raw?.period_end || undefined,
    filePath: rawFilePath,
    fileType: raw?.fileType || raw?.file_type || undefined,
    fileName: raw?.fileName || raw?.file_name || undefined,
    fileDataUrl: undefined,
    paidToProvider: Boolean(raw?.paidToProvider ?? raw?.paid_to_provider),
    paidToProviderAt: raw?.paidToProviderAt || raw?.paid_to_provider_at || undefined,
    createdBy: String(raw?.createdBy || raw?.created_by || ''),
    createdAt,
    splits,
  };
}

export function normalizeBillsList(rawList: any): Bill[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter((b: any) => b && !LEGACY_MOCK_BILL_IDS.has(b.id))
    .map((b: any) => normalizeBill(b));
}

export function loadCachedBills(): Bill[] {
  const parsed = safeGetLocalStorage<any[]>(LS_BILLS_KEY, []);
  return normalizeBillsList(parsed);
}

export function loadCachedHousehold(): Household {
  const parsed = safeGetLocalStorage<any>(LS_HOUSE_KEY, null);
  return parsed ? normalizeHousehold(parsed, INITIAL_HOUSEHOLD) : INITIAL_HOUSEHOLD;
}

export function loadCachedSplitRules(): CategorySplitRule[] {
  const parsed = safeGetLocalStorage<any[]>(LS_RULES_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (r) =>
      r &&
      typeof r.categoryId === 'string' &&
      typeof r.profileId === 'string' &&
      !LEGACY_MOCK_PROFILE_IDS.has(r.profileId) &&
      Number.isFinite(Number(r.defaultPercentage))
  );
}

export const reconcileSplitRules = (
  currentRules: CategorySplitRule[],
  activeProfiles: Profile[],
  categoriesList: BillCategory[]
): CategorySplitRule[] => {
  if (activeProfiles.length === 0) return [];

  const activeIds = new Set(activeProfiles.map((p) => p.id));
  const validRules = currentRules.filter((r) => activeIds.has(r.profileId));

  const equalPct = Number((100 / activeProfiles.length).toFixed(1));
  const reconciled: CategorySplitRule[] = [];

  for (const cat of categoriesList) {
    const catRules = validRules.filter((r) => r.categoryId === cat.id);
    const sum = catRules.reduce((acc, r) => acc + r.defaultPercentage, 0);

    if (catRules.length === activeProfiles.length && Math.abs(sum - 100) < 0.1) {
      reconciled.push(...catRules);
    } else {
      activeProfiles.forEach((p, idx) => {
        reconciled.push({
          id: `r-${cat.id}-${p.id}`,
          categoryId: cat.id,
          profileId: p.id,
          defaultPercentage:
            idx === 0
              ? Number((100 - equalPct * (activeProfiles.length - 1)).toFixed(1))
              : equalPct,
        });
      });
    }
  }

  return reconciled;
};
