import { Household, Profile, BillCategory, CategorySplitRule, Bill } from '../types';

export const INITIAL_HOUSEHOLD: Household = {
  id: 'house-1',
  name: 'Maple Street Home',
  currency: 'EUR',
  inviteCode: 'MAPLE-2026',
  adminPaymentInfo: {
    iban: 'PT50 0033 0000 1234 5678 9012 3',
    revolut: '@will_admin',
    bizum: '+351 912 345 678',
    notes: 'Please add your name and bill month in transfer description.',
  },
  webhookSettings: {
    discordUrl: '',
    notifyOnNewBill: true,
    notifyOnPayment: true,
  },
  createdAt: new Date().toISOString(),
};

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'user-admin',
    householdId: 'house-1',
    fullName: 'Will (You)',
    nickname: 'Will',
    email: 'will@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
    role: 'admin',
    isActive: true,
  },
  {
    id: 'mate-1',
    householdId: 'house-1',
    fullName: 'Alex Miller',
    nickname: 'Alex',
    email: 'alex@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80',
    role: 'member',
    isActive: true,
  },
  {
    id: 'mate-2',
    householdId: 'house-1',
    fullName: 'Sam Chen',
    nickname: 'Sam',
    email: 'sam@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&auto=format&fit=crop&q=80',
    role: 'member',
    isActive: true,
  },
];

export const INITIAL_CATEGORIES: BillCategory[] = [
  {
    id: 'cat-rent',
    householdId: 'house-1',
    name: 'Rent',
    code: 'rent',
    icon: 'Home',
    colorHex: '#8b5cf6', // Violet
  },
  {
    id: 'cat-elec',
    householdId: 'house-1',
    name: 'Electricity',
    code: 'electricity',
    icon: 'Zap',
    colorHex: '#eab308', // Yellow
  },
  {
    id: 'cat-water',
    householdId: 'house-1',
    name: 'Water',
    code: 'water',
    icon: 'Droplet',
    colorHex: '#06b6d4', // Cyan
  },
  {
    id: 'cat-net',
    householdId: 'house-1',
    name: 'Internet',
    code: 'internet',
    icon: 'Wifi',
    colorHex: '#3b82f6', // Blue
  },
  {
    id: 'cat-gas',
    householdId: 'house-1',
    name: 'Gas',
    code: 'gas',
    icon: 'Flame',
    colorHex: '#f97316', // Orange
  },
];

export const INITIAL_RULES: CategorySplitRule[] = [
  // Rent: 50% Will, 25% Alex, 25% Sam
  { id: 'r-rent-1', categoryId: 'cat-rent', profileId: 'user-admin', defaultPercentage: 50.0 },
  { id: 'r-rent-2', categoryId: 'cat-rent', profileId: 'mate-1', defaultPercentage: 25.0 },
  { id: 'r-rent-3', categoryId: 'cat-rent', profileId: 'mate-2', defaultPercentage: 25.0 },

  // Electricity: 33.34% Will, 33.33% Alex, 33.33% Sam
  { id: 'r-elec-1', categoryId: 'cat-elec', profileId: 'user-admin', defaultPercentage: 33.34 },
  { id: 'r-elec-2', categoryId: 'cat-elec', profileId: 'mate-1', defaultPercentage: 33.33 },
  { id: 'r-elec-3', categoryId: 'cat-elec', profileId: 'mate-2', defaultPercentage: 33.33 },

  // Water: 33.34% Will, 33.33% Alex, 33.33% Sam
  { id: 'r-wat-1', categoryId: 'cat-water', profileId: 'user-admin', defaultPercentage: 33.34 },
  { id: 'r-wat-2', categoryId: 'cat-water', profileId: 'mate-1', defaultPercentage: 33.33 },
  { id: 'r-wat-3', categoryId: 'cat-water', profileId: 'mate-2', defaultPercentage: 33.33 },

  // Internet: 33.34% Will, 33.33% Alex, 33.33% Sam
  { id: 'r-net-1', categoryId: 'cat-net', profileId: 'user-admin', defaultPercentage: 33.34 },
  { id: 'r-net-2', categoryId: 'cat-net', profileId: 'mate-1', defaultPercentage: 33.33 },
  { id: 'r-net-3', categoryId: 'cat-net', profileId: 'mate-2', defaultPercentage: 33.33 },

  // Gas: 33.34% Will, 33.33% Alex, 33.33% Sam
  { id: 'r-gas-1', categoryId: 'cat-gas', profileId: 'user-admin', defaultPercentage: 33.34 },
  { id: 'r-gas-2', categoryId: 'cat-gas', profileId: 'mate-1', defaultPercentage: 33.33 },
  { id: 'r-gas-3', categoryId: 'cat-gas', profileId: 'mate-2', defaultPercentage: 33.33 },
];

export const INITIAL_BILLS: Bill[] = [
  {
    id: 'bill-1',
    householdId: 'house-1',
    categoryId: 'cat-rent',
    providerName: 'Landlord Monthly Rent',
    invoiceNumber: 'RENT-OCT-2026',
    totalAmount: 1400.0,
    currency: 'EUR',
    issueDate: '2026-10-01',
    dueDate: '2026-10-31',
    fileName: 'Rent_Receipt_Oct2026.pdf',
    paidToProvider: true,
    paidToProviderAt: '2026-10-01T10:00:00Z',
    createdBy: 'user-admin',
    createdAt: '2026-10-01T10:00:00Z',
    splits: [
      { id: 's-1-1', billId: 'bill-1', profileId: 'user-admin', percentage: 50.0, amountDue: 700.0, status: 'confirmed_by_admin' },
      { id: 's-1-2', billId: 'bill-1', profileId: 'mate-1', percentage: 25.0, amountDue: 350.0, status: 'confirmed_by_admin', markedPaidAt: '2026-10-02T14:30:00Z', confirmedPaidAt: '2026-10-02T15:00:00Z' },
      { id: 's-1-3', billId: 'bill-1', profileId: 'mate-2', percentage: 25.0, amountDue: 350.0, status: 'confirmed_by_admin', markedPaidAt: '2026-10-02T14:35:00Z', confirmedPaidAt: '2026-10-02T15:00:00Z' },
    ],
  },
  {
    id: 'bill-2',
    householdId: 'house-1',
    categoryId: 'cat-elec',
    providerName: 'EDP Comercial',
    invoiceNumber: 'EDP-884920',
    totalAmount: 114.50,
    currency: 'EUR',
    issueDate: '2026-10-05',
    dueDate: '2026-10-22',
    fileName: 'EDP_Electricity_Invoice_Oct2026.pdf',
    paidToProvider: true,
    paidToProviderAt: '2026-10-06T12:00:00Z',
    createdBy: 'user-admin',
    createdAt: '2026-10-06T12:00:00Z',
    splits: [
      { id: 's-2-1', billId: 'bill-2', profileId: 'user-admin', percentage: 33.34, amountDue: 38.18, status: 'confirmed_by_admin' },
      { id: 's-2-2', billId: 'bill-2', profileId: 'mate-1', percentage: 33.33, amountDue: 38.16, status: 'pending' },
      { id: 's-2-3', billId: 'bill-2', profileId: 'mate-2', percentage: 33.33, amountDue: 38.16, status: 'paid_to_admin', markedPaidAt: '2026-10-08T18:20:00Z' },
    ],
  },
  {
    id: 'bill-3',
    householdId: 'house-1',
    categoryId: 'cat-net',
    providerName: 'Vodafone Fiber 1Gbps',
    invoiceNumber: 'VF-2026-991',
    totalAmount: 39.99,
    currency: 'EUR',
    issueDate: '2026-10-08',
    dueDate: '2026-10-25',
    fileName: 'Vodafone_Bill_Oct2026.pdf',
    paidToProvider: true,
    paidToProviderAt: '2026-10-08T09:00:00Z',
    createdBy: 'user-admin',
    createdAt: '2026-10-08T09:00:00Z',
    splits: [
      { id: 's-3-1', billId: 'bill-3', profileId: 'user-admin', percentage: 33.34, amountDue: 13.33, status: 'confirmed_by_admin' },
      { id: 's-3-2', billId: 'bill-3', profileId: 'mate-1', percentage: 33.33, amountDue: 13.33, status: 'pending' },
      { id: 's-3-3', billId: 'bill-3', profileId: 'mate-2', percentage: 33.33, amountDue: 13.33, status: 'pending' },
    ],
  },
  // Previous Month (September 2026) - Historical settled bills
  {
    id: 'bill-sep-rent',
    householdId: 'house-1',
    categoryId: 'cat-rent',
    providerName: 'Landlord Monthly Rent',
    invoiceNumber: 'RENT-SEP-2026',
    totalAmount: 1400.0,
    currency: 'EUR',
    issueDate: '2026-09-01',
    dueDate: '2026-09-30',
    fileName: 'Rent_Receipt_Sep2026.pdf',
    paidToProvider: true,
    paidToProviderAt: '2026-09-01T10:00:00Z',
    createdBy: 'user-admin',
    createdAt: '2026-09-01T10:00:00Z',
    splits: [
      { id: 's-sep-r-1', billId: 'bill-sep-rent', profileId: 'user-admin', percentage: 50.0, amountDue: 700.0, status: 'confirmed_by_admin' },
      { id: 's-sep-r-2', billId: 'bill-sep-rent', profileId: 'mate-1', percentage: 25.0, amountDue: 350.0, status: 'confirmed_by_admin', markedPaidAt: '2026-09-03T11:00:00Z', confirmedPaidAt: '2026-09-03T12:00:00Z' },
      { id: 's-sep-r-3', billId: 'bill-sep-rent', profileId: 'mate-2', percentage: 25.0, amountDue: 350.0, status: 'confirmed_by_admin', markedPaidAt: '2026-09-03T11:10:00Z', confirmedPaidAt: '2026-09-03T12:00:00Z' },
    ],
  },
  {
    id: 'bill-sep-elec',
    householdId: 'house-1',
    categoryId: 'cat-elec',
    providerName: 'EDP Comercial',
    invoiceNumber: 'EDP-772109',
    totalAmount: 98.40,
    currency: 'EUR',
    issueDate: '2026-09-05',
    dueDate: '2026-09-22',
    fileName: 'EDP_Electricity_Invoice_Sep2026.pdf',
    paidToProvider: true,
    paidToProviderAt: '2026-09-06T10:00:00Z',
    createdBy: 'user-admin',
    createdAt: '2026-09-06T10:00:00Z',
    splits: [
      { id: 's-sep-e-1', billId: 'bill-sep-elec', profileId: 'user-admin', percentage: 33.34, amountDue: 32.80, status: 'confirmed_by_admin' },
      { id: 's-sep-e-2', billId: 'bill-sep-elec', profileId: 'mate-1', percentage: 33.33, amountDue: 32.80, status: 'confirmed_by_admin', markedPaidAt: '2026-09-10T14:00:00Z', confirmedPaidAt: '2026-09-10T15:00:00Z' },
      { id: 's-sep-e-3', billId: 'bill-sep-elec', profileId: 'mate-2', percentage: 33.33, amountDue: 32.80, status: 'confirmed_by_admin', markedPaidAt: '2026-09-10T14:15:00Z', confirmedPaidAt: '2026-09-10T15:00:00Z' },
    ],
  },
];
