-- HouseSplits Supabase Database Schema
-- Run this script in your Supabase SQL Editor

-- 1. Households Table
CREATE TABLE IF NOT EXISTS public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Our Home',
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    admin_payment_info JSONB DEFAULT '{"iban": "", "revolut": "", "bizum": "", "notes": ""}'::jsonb,
    webhook_settings JSONB DEFAULT '{"discord_url": "", "notify_on_new_bill": true, "notify_on_payment": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles Table (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    nickname TEXT,
    email TEXT,
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Bill Categories
CREATE TABLE IF NOT EXISTS public.bill_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code VARCHAR(50) NOT NULL, -- 'rent', 'electricity', 'water', 'internet', 'gas', 'other'
    icon TEXT DEFAULT 'zap',
    color_hex VARCHAR(7) DEFAULT '#10b981',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Category Default Split Rules
CREATE TABLE IF NOT EXISTS public.category_split_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.bill_categories(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    default_percentage NUMERIC(5, 2) NOT NULL CHECK (default_percentage >= 0 AND default_percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(category_id, profile_id)
);

-- 5. Bills
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.bill_categories(id),
    provider_name TEXT NOT NULL,
    invoice_number TEXT,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    issue_date DATE,
    due_date DATE NOT NULL,
    period_start DATE,
    period_end DATE,
    file_path TEXT,
    file_type VARCHAR(50),
    paid_to_provider BOOLEAN DEFAULT false,
    paid_to_provider_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Bill Splits
CREATE TABLE IF NOT EXISTS public.bill_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    percentage NUMERIC(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    amount_due NUMERIC(10, 2) NOT NULL CHECK (amount_due >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid_to_admin', 'confirmed_by_admin')),
    marked_paid_at TIMESTAMPTZ,
    confirmed_paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(bill_id, profile_id)
);

-- 7. Payment Transactions
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    confirmed_at TIMESTAMPTZ
);

-- Row Level Security (RLS)
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_split_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Storage bucket for bill attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bills', 'bills', false)
ON CONFLICT (id) DO NOTHING;
