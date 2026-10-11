interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    const url = new URL(request.url);
    const householdId = url.searchParams.get('household_id');

    let billsQuery = 'SELECT * FROM bills';
    let billsRes: any[];

    if (householdId) {
      const res = await env.DB.prepare(`${billsQuery} WHERE household_id = ? ORDER BY due_date DESC`)
        .bind(householdId)
        .all();
      billsRes = res.results || [];
    } else {
      const res = await env.DB.prepare(`${billsQuery} ORDER BY due_date DESC`).all();
      billsRes = res.results || [];
    }

    // Fetch splits for all bills
    const { results: allSplits } = await env.DB.prepare('SELECT * FROM bill_splits').all();
    const splitsByBill: Record<string, any[]> = {};
    (allSplits || []).forEach((s: any) => {
      if (!splitsByBill[s.bill_id]) splitsByBill[s.bill_id] = [];
      splitsByBill[s.bill_id].push({
        id: s.id,
        billId: s.bill_id,
        profileId: s.profile_id,
        amount: s.amount,
        amountDue: s.amount,
        percentage: s.percentage,
        status: s.status,
        paidAt: s.paid_at,
        markedPaidAt: s.paid_at,
        confirmedAt: s.confirmed_at,
        confirmedPaidAt: s.confirmed_at,
        notes: s.notes,
      });
    });

    const formattedBills = billsRes.map((b: any) => ({
      id: b.id,
      householdId: b.household_id,
      categoryId: b.category_id,
      providerName: b.provider_name,
      invoiceNumber: b.invoice_number,
      totalAmount: b.total_amount,
      currency: b.currency,
      issueDate: b.issue_date,
      dueDate: b.due_date,
      periodStart: b.period_start,
      periodEnd: b.period_end,
      filePath: b.file_path,
      fileType: b.file_type,
      paidToProvider: Boolean(b.paid_to_provider),
      paidToProviderAt: b.paid_to_provider_at,
      createdBy: b.created_by,
      createdAt: b.created_at,
      splits: splitsByBill[b.id] || [],
    }));

    return new Response(JSON.stringify(formattedBills), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching bills';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    const bill = (await request.json()) as any;
    const newId = bill.id || crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 1. Resolve Household ID
    let householdId = bill.householdId;
    const houseExists = await env.DB.prepare('SELECT id FROM households WHERE id = ?').bind(householdId).first();
    if (!houseExists) {
      const fallbackHouse = await env.DB.prepare('SELECT id FROM households ORDER BY created_at ASC LIMIT 1').first();
      if (fallbackHouse?.id) {
        householdId = fallbackHouse.id as string;
      } else {
        return new Response(JSON.stringify({ error: 'No valid household found' }), { status: 400 });
      }
    }

    // 2. Resolve Category ID (handles frontend 'cat-rent', 'cat-elec', UUIDs, codes)
    let categoryId = bill.categoryId;
    const catExists = await env.DB.prepare('SELECT id FROM bill_categories WHERE id = ?').bind(categoryId).first();

    if (!catExists) {
      const codeCandidate = (categoryId || 'utility').replace(/^cat-/, '').toLowerCase();
      const codeMapping: Record<string, string> = {
        elec: 'electricity',
        net: 'internet',
        wat: 'water',
      };
      const normalizedCode = codeMapping[codeCandidate] || codeCandidate;

      const matched = await env.DB.prepare(
        'SELECT id FROM bill_categories WHERE household_id = ? AND (code = ? OR code = ? OR id = ?) LIMIT 1'
      )
        .bind(householdId, codeCandidate, normalizedCode, categoryId)
        .first();

      if (matched?.id) {
        categoryId = matched.id as string;
      } else {
        // Fallback: check any category in household
        const anyCat = await env.DB.prepare(
          'SELECT id FROM bill_categories WHERE household_id = ? LIMIT 1'
        ).bind(householdId).first();

        if (anyCat?.id) {
          categoryId = anyCat.id as string;
        } else {
          // Create new category in bill_categories if none exist
          const newCatId = crypto.randomUUID();
          const catName = normalizedCode.charAt(0).toUpperCase() + normalizedCode.slice(1);
          await env.DB.prepare(
            'INSERT INTO bill_categories (id, household_id, name, code, icon, color_hex) VALUES (?, ?, ?, ?, ?, ?)'
          )
            .bind(newCatId, householdId, catName, normalizedCode, 'zap', '#10b981')
            .run();
          categoryId = newCatId;
        }
      }
    }

    // 3. Resolve created_by profile
    let createdBy = bill.createdBy;
    if (createdBy) {
      const profileExists = await env.DB.prepare('SELECT id FROM profiles WHERE id = ?').bind(createdBy).first();
      if (!profileExists) {
        const adminProfile = await env.DB.prepare(
          'SELECT id FROM profiles WHERE household_id = ? AND role = "admin" LIMIT 1'
        ).bind(householdId).first();
        createdBy = adminProfile?.id ? (adminProfile.id as string) : null;
      }
    }

    // 4. Insert bill record
    await env.DB.prepare(
      `INSERT INTO bills (
        id, household_id, category_id, provider_name, invoice_number, total_amount, currency,
        issue_date, due_date, period_start, period_end, file_path, file_type, paid_to_provider,
        paid_to_provider_at, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        newId,
        householdId,
        categoryId,
        bill.providerName,
        bill.invoiceNumber || '',
        bill.totalAmount,
        bill.currency || 'EUR',
        bill.issueDate || null,
        bill.dueDate,
        bill.periodStart || null,
        bill.periodEnd || null,
        bill.filePath || null,
        bill.fileType || null,
        bill.paidToProvider ? 1 : 0,
        bill.paidToProviderAt || null,
        createdBy || null,
        nowIso
      )
      .run();

    // 5. Insert bill splits
    const insertedSplits: any[] = [];
    if (bill.splits && Array.isArray(bill.splits)) {
      // Find admin profile for fallback mapping if needed
      const adminProfile = await env.DB.prepare(
        'SELECT id FROM profiles WHERE household_id = ? AND role = "admin" LIMIT 1'
      ).bind(householdId).first();
      const adminId = adminProfile?.id as string | undefined;

      for (const split of bill.splits) {
        let splitProfileId = split.profileId;
        const pExists = await env.DB.prepare('SELECT id FROM profiles WHERE id = ?').bind(splitProfileId).first();

        if (!pExists) {
          if ((splitProfileId === 'user-admin' || !splitProfileId) && adminId) {
            splitProfileId = adminId;
          } else {
            // Profile does not exist in DB; skip this split to prevent foreign key abort
            continue;
          }
        }

        const splitId = split.id || crypto.randomUUID();
        const amount = split.amountDue !== undefined ? split.amountDue : (split.amount || 0);

        await env.DB.prepare(
          `INSERT INTO bill_splits (
            id, bill_id, profile_id, amount, percentage, status, paid_at, confirmed_at, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            splitId,
            newId,
            splitProfileId,
            amount,
            split.percentage,
            split.status || 'pending',
            split.markedPaidAt || split.paidAt || null,
            split.confirmedPaidAt || split.confirmedAt || null,
            split.notes || null
          )
          .run();

        insertedSplits.push({
          id: splitId,
          billId: newId,
          profileId: splitProfileId,
          amount,
          amountDue: amount,
          percentage: split.percentage,
          status: split.status || 'pending',
          paidAt: split.markedPaidAt || split.paidAt || null,
          markedPaidAt: split.markedPaidAt || split.paidAt || null,
          confirmedAt: split.confirmedPaidAt || split.confirmedAt || null,
          confirmedPaidAt: split.confirmedPaidAt || split.confirmedAt || null,
          notes: split.notes || null,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ...bill,
        id: newId,
        householdId,
        categoryId,
        createdBy,
        splits: insertedSplits,
        createdAt: nowIso,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating bill';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
