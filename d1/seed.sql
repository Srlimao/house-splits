-- Seed Initial Data for HouseSplits on Cloudflare D1

-- 1. Insert Initial Household
INSERT OR IGNORE INTO households (
    id,
    name,
    currency,
    invite_code,
    admin_payment_info,
    webhook_settings
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Maple Street Home',
    'EUR',
    'HOUSE-QN5C',
    '{"iban": "ES91 2100 0418 4502 0005 1332", "revolut": "@williamsplits", "bizum": "+34 611 223 344", "notes": "Please include your name in the payment description."}',
    '{"discord_url": "", "notify_on_new_bill": true, "notify_on_payment": true}'
);

-- 2. Insert Bill Categories
INSERT OR IGNORE INTO bill_categories (id, household_id, name, code, icon, color_hex) VALUES
('cat-rent', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rent', 'rent', 'home', '#6366f1'),
('cat-electricity', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Electricity', 'electricity', 'zap', '#f59e0b'),
('cat-water', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Water', 'water', 'droplet', '#3b82f6'),
('cat-internet', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Internet', 'internet', 'wifi', '#8b5cf6'),
('cat-gas', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Gas', 'gas', 'flame', '#ef4444');

-- 3. Seed Users
-- Admin: w.back93@gmail.com / Password123!
INSERT OR IGNORE INTO profiles (
    id,
    household_id,
    full_name,
    email,
    password_hash,
    role,
    is_system_manager,
    is_active
) VALUES (
    '7f0f70bd-a63b-47a4-a60e-3a4b7512cd20',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Willian Backhaus',
    'w.back93@gmail.com',
    '73616c745f686f75736573706c697473:e40227fa640d2f13752f6d740d4e200bf738cca624c0604f9bde9ce35cc2663c',
    'admin',
    0,
    1
);

-- System Manager: manager@dunhas.com / Manager2026!#
INSERT OR IGNORE INTO profiles (
    id,
    household_id,
    full_name,
    email,
    password_hash,
    role,
    is_system_manager,
    is_active
) VALUES (
    'a0e637eb-e349-4e76-875a-45c3ef8ead58',
    NULL,
    'System Manager',
    'manager@dunhas.com',
    '73616c745f6d616e616765725f687370:e6868f91706cb9bdf3bc8210cec496d6b08331962b5670f017ec9645193b2990',
    'system_manager',
    1,
    1
);
