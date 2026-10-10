-- Seed default Household and Categories for HouseSplits

-- 1. Default Household
INSERT INTO public.households (id, name, currency, admin_payment_info, webhook_settings)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Maple Street Home',
    'EUR',
    '{"iban": "PT50 0033 0000 1234 5678 9012 3", "revolut": "@will_admin", "bizum": "+351 912 345 678", "notes": "Please include your name and the bill month in description."}'::jsonb,
    '{"discord_url": "", "notify_on_new_bill": true, "notify_on_payment": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 2. Default Categories
INSERT INTO public.bill_categories (id, household_id, name, code, icon, color_hex)
VALUES 
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rent', 'rent', 'Home', '#8b5cf6'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Electricity', 'electricity', 'Zap', '#eab308'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Water', 'water', 'Droplet', '#06b6d4'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Internet', 'internet', 'Wifi', '#3b82f6'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Gas', 'gas', 'Flame', '#f97316')
ON CONFLICT (id) DO NOTHING;
