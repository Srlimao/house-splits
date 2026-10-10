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

    // Fetch splits for these bills
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

    await env.DB.prepare(
      `INSERT INTO bills (
        id, household_id, category_id, provider_name, invoice_number, total_amount, currency,
        issue_date, due_date, period_start, period_end, file_path, file_type, paid_to_provider,
        paid_to_provider_at, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        newId,
        bill.householdId,
        bill.categoryId,
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
        bill.createdBy || null,
        nowIso
      )
      .run();

    // Insert bill splits
    if (bill.splits && Array.isArray(bill.splits)) {
      for (const split of bill.splits) {
        const splitId = split.id || crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO bill_splits (
            id, bill_id, profile_id, amount, percentage, status, paid_at, confirmed_at, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            splitId,
            newId,
            split.profileId,
            split.amountDue !== undefined ? split.amountDue : (split.amount || 0),
            split.percentage,
            split.status || 'pending',
            split.markedPaidAt || split.paidAt || null,
            split.confirmedPaidAt || split.confirmedAt || null,
            split.notes || null
          )
          .run();
      }
    }

    return new Response(JSON.stringify({ id: newId, ...bill }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating bill';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
