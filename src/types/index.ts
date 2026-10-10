export type UserRole = 'admin' | 'member';

export type SplitStatus = 'pending' | 'paid_to_admin' | 'confirmed_by_admin';

export type BillCategoryCode = 'rent' | 'electricity' | 'water' | 'internet' | 'gas' | 'other';

export interface AdminPaymentInfo {
  iban: string;
  revolut: string;
  bizum: string;
  notes: string;
}

export interface WebhookSettings {
  discordUrl: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  notifyOnNewBill: boolean;
  notifyOnPayment: boolean;
}

export interface Household {
  id: string;
  name: string;
  currency: string;
  inviteCode: string;
  adminPaymentInfo: AdminPaymentInfo;
  webhookSettings: WebhookSettings;
  createdAt: string;
}

export interface Profile {
  id: string;
  householdId: string;
  fullName: string;
  nickname?: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
}

export interface BillCategory {
  id: string;
  householdId: string;
  name: string;
  code: BillCategoryCode;
  icon: string;
  colorHex: string;
}

export interface CategorySplitRule {
  id: string;
  categoryId: string;
  profileId: string;
  defaultPercentage: number;
}

export interface BillSplit {
  id: string;
  billId: string;
  profileId: string;
  percentage: number;
  amountDue: number;
  status: SplitStatus;
  markedPaidAt?: string;
  confirmedPaidAt?: string;
  notes?: string;
}

export interface Bill {
  id: string;
  householdId: string;
  categoryId: string;
  providerName: string;
  invoiceNumber?: string;
  totalAmount: number;
  currency: string;
  issueDate?: string;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  filePath?: string;
  fileType?: string;
  fileName?: string;
  fileDataUrl?: string;
  paidToProvider: boolean;
  paidToProviderAt?: string;
  createdBy: string;
  createdAt: string;
  splits: BillSplit[];
}

export interface PaymentLog {
  id: string;
  householdId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  paymentMethod: string;
  status: 'pending' | 'confirmed' | 'rejected';
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface GeminiExtractionResult {
  providerName: string;
  categorySuggestion: BillCategoryCode;
  invoiceNumber?: string;
  totalAmount: number;
  currency: string;
  issueDate?: string;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  confidenceScore: number;
  notes?: string;
}
