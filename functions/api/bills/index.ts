import {
  MAX_INLINE_DATA_URL_CHARS,
  resolveBillHouseholdId,
  resolveBillCategoryId,
  resolveBillCreatorId,
  insertBillSplitsInDb,
} from '../_billDbHelpers';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    const url = new URL(request.url);
    const householdId = url.searchParams.get('household_id');

    let billsRes: any[];
    let allSplits: any[];

    if (householdId) {
      const res = await env.DB.prepare('SELECT * FROM bills WHERE household_id = ? ORDER BY due_date DESC')
        .bind(householdId)
        .all();
      billsRes = res.results || [];

      const splitRes = await env.DB.prepare(
        'SELECT s.* FROM bill_splits s JOIN bills b ON b.id = s.bill_id WHERE b.household_id = ?'
      )
        .bind(householdId)
        .all();
      allSplits = splitRes.results || [];
    } else {
      const res = await env.DB.prepare('SELECT * FROM bills ORDER BY due_date DESC').all();
      billsRes = res.results || [];

      const splitRes = await env.DB.prepare('SELECT * FROM bill_splits').all();
      allSplits = splitRes.results || [];
    }

    const splitsByBill: Record<string, any[]> = {};
    allSplits.forEach((s: any) => {
      if (!splitsByBill[s.bill_id]) splitsByBill[s.bill_id] = [];
      const amount = Number(s.amount) || 0;
      const percentage = Number(s.percentage) || 0;
      splitsByBill[s.bill_id].push({
        id: s.id,
        billId: s.bill_id,
        profileId: s.profile_id,
        amount,
        amountDue: amount,
        percentage,
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
      totalAmount: Number(b.total_amount) || 0,
      currency: b.currency || 'EUR',
      issueDate: b.issue_date,
      dueDate: b.due_date,
      periodStart: b.period_start,
      periodEnd: b.period_end,
      filePath: b.file_path || undefined,
      fileType: b.file_type || undefined,
      fileName:
        b.file_name ||
        (b.file_path && !b.file_path.startsWith('data:')
          ? b.file_path.split('/').pop()?.split('?')[0]
          : undefined),
      fileDataUrl: undefined,
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
    const dueDate = bill.dueDate || bill.issueDate || nowIso.split('T')[0];

    const householdId = await resolveBillHouseholdId(env.DB, bill.householdId);
    if (!householdId) {
      return new Response(JSON.stringify({ error: 'No valid household found' }), { status: 400 });
    }

    const categoryId = await resolveBillCategoryId(env.DB, householdId, bill.categoryId);
    const createdBy = await resolveBillCreatorId(env.DB, householdId, bill.createdBy);

    const rawPath = bill.filePath || bill.fileDataUrl || null;
    const isOversizedDataUrl =
      typeof rawPath === 'string' && rawPath.startsWith('data:') && rawPath.length > MAX_INLINE_DATA_URL_CHARS;
    let safeFilePath: string | null = isOversizedDataUrl ? null : rawPath;
    const fileType = bill.fileType || null;
    const fileName =
      bill.fileName ||
      (typeof safeFilePath === 'string' && !safeFilePath.startsWith('data:')
        ? safeFilePath.split('/').pop()?.split('?')[0]
        : null);

    const insertBillRow = async (pathToPersist: string | null) => {
      await env.DB.prepare(
        `INSERT INTO bills (
          id, household_id, category_id, provider_name, invoice_number, total_amount, currency,
          issue_date, due_date, period_start, period_end, file_path, file_type, file_name, paid_to_provider,
          paid_to_provider_at, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          newId,
          householdId,
          categoryId,
          bill.providerName || 'Utility Bill',
          bill.invoiceNumber || '',
          Number(bill.totalAmount) || 0,
          bill.currency || 'EUR',
          bill.issueDate || null,
          dueDate,
          bill.periodStart || null,
          bill.periodEnd || null,
          pathToPersist,
          fileType,
          fileName,
          bill.paidToProvider ? 1 : 0,
          bill.paidToProviderAt || null,
          createdBy,
          nowIso
        )
        .run();
    };

    try {
      await insertBillRow(safeFilePath);
    } catch (insertErr) {
      if (safeFilePath !== null) {
        safeFilePath = null;
        await insertBillRow(null);
      } else {
        throw insertErr;
      }
    }

    const insertedSplits = await insertBillSplitsInDb(env.DB, newId, householdId, bill.splits || []);

    return new Response(
      JSON.stringify({
        ...bill,
        id: newId,
        householdId,
        categoryId,
        dueDate,
        filePath: safeFilePath || undefined,
        fileName: fileName || undefined,
        fileType: fileType || undefined,
        fileDataUrl: undefined,
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
