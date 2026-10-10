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

export const INITIAL_RULES: CategorySplitRule[] = [];

export const INITIAL_BILLS: Bill[] = [];
