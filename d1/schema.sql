-- HouseSplits Cloudflare D1 Database Schema (SQLite)
-- Execute in Cloudflare D1 via Wrangler or Cloudflare Dashboard SQL Console

-- 1. Households Table
CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Our Home',
    currency TEXT NOT NULL DEFAULT 'EUR',
    invite_code TEXT UNIQUE,
    admin_payment_info TEXT DEFAULT '{"iban":"","revolut":"","bizum":"","notes":""}',
    webhook_settings TEXT DEFAULT '{"discord_url":"","notify_on_new_bill":true,"notify_on_payment":true}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Profiles Table (Holds authentication and user profile data)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    nickname TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80',
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'system_manager')),
    is_system_manager INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Bill Categories
CREATE TABLE IF NOT EXISTS bill_categories (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    icon TEXT DEFAULT 'zap',
    color_hex TEXT DEFAULT '#10b981',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 4. Category Split Rules
CREATE TABLE IF NOT EXISTS category_split_rules (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES bill_categories(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    default_percentage REAL NOT NULL CHECK (default_percentage >= 0 AND default_percentage <= 100),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(category_id, profile_id)
);

-- 5. Bills
CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES bill_categories(id),
    provider_name TEXT NOT NULL,
    invoice_number TEXT,
    total_amount REAL NOT NULL CHECK (total_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    issue_date TEXT,
    due_date TEXT NOT NULL,
    period_start TEXT,
    period_end TEXT,
    file_path TEXT,
    file_type TEXT,
    file_name TEXT,
    paid_to_provider INTEGER DEFAULT 0,
    paid_to_provider_at TEXT,
    created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 6. Bill Splits
CREATE TABLE IF NOT EXISTS bill_splits (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK (amount >= 0),
    percentage REAL NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid_to_admin', 'confirmed_by_admin')),
    paid_at TEXT,
    confirmed_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 7. Payments
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    bill_id TEXT REFERENCES bills(id) ON DELETE SET NULL,
    payer_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    payment_method TEXT NOT NULL,
    notes TEXT,
    confirmed INTEGER DEFAULT 0,
    confirmed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 8. Push Subscriptions (Web Push / PWA Android Notifications)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    household_id TEXT REFERENCES households(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
