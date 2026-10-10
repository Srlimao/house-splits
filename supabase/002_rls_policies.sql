-- HouseSplits Row Level Security (RLS) Policies

-- 1. Households Policies
CREATE POLICY "Allow public read access to households"
ON public.households FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create households"
ON public.households FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow household updates"
ON public.households FOR UPDATE
TO anon, authenticated
USING (true);

-- 2. Profiles Policies
CREATE POLICY "Allow read profiles"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert profiles"
ON public.profiles FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow update own profile"
ON public.profiles FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow delete profiles"
ON public.profiles FOR DELETE
TO anon, authenticated
USING (true);

-- 3. Bill Categories Policies
CREATE POLICY "Allow read categories"
ON public.bill_categories FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow manage categories"
ON public.bill_categories FOR ALL
TO anon, authenticated
USING (true);

-- 4. Category Split Rules Policies
CREATE POLICY "Allow read split rules"
ON public.category_split_rules FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow manage split rules"
ON public.category_split_rules FOR ALL
TO anon, authenticated
USING (true);

-- 5. Bills Policies
CREATE POLICY "Allow read bills"
ON public.bills FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert and update bills"
ON public.bills FOR ALL
TO anon, authenticated
USING (true);

-- 6. Bill Splits Policies
CREATE POLICY "Allow read bill splits"
ON public.bill_splits FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow manage bill splits"
ON public.bill_splits FOR ALL
TO anon, authenticated
USING (true);

-- 7. Payments Policies
CREATE POLICY "Allow read payments"
ON public.payments FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert payments"
ON public.payments FOR ALL
TO anon, authenticated
USING (true);

-- 8. Storage bucket policies for bills
CREATE POLICY "Allow access to bills bucket"
ON storage.objects FOR ALL
TO anon, authenticated
USING (bucket_id = 'bills')
WITH CHECK (bucket_id = 'bills');
