interface Env {
  DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const { params, request, env } = context;
    const billId = params.id as string;
    const body = (await request.json()) as any;

    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    if (body.paidToProvider !== undefined) {
      await env.DB.prepare(
        'UPDATE bills SET paid_to_provider = ?, paid_to_provider_at = ?, updated_at = datetime("now") WHERE id = ?'
      )
        .bind(body.paidToProvider ? 1 : 0, body.paidToProviderAt || null, billId)
        .run();
    }

    if (body.totalAmount !== undefined) {
      await env.DB.prepare(
        'UPDATE bills SET total_amount = ?, updated_at = datetime("now") WHERE id = ?'
      )
        .bind(body.totalAmount, billId)
        .run();
    }

    if (body.providerName !== undefined) {
      await env.DB.prepare(
        'UPDATE bills SET provider_name = ?, updated_at = datetime("now") WHERE id = ?'
      )
        .bind(body.providerName, billId)
        .run();
    }

    if (body.dueDate !== undefined) {
      await env.DB.prepare(
        'UPDATE bills SET due_date = ?, updated_at = datetime("now") WHERE id = ?'
      )
        .bind(body.dueDate, billId)
        .run();
    }

    if (body.invoiceNumber !== undefined) {
      await env.DB.prepare(
        'UPDATE bills SET invoice_number = ?, updated_at = datetime("now") WHERE id = ?'
      )
        .bind(body.invoiceNumber || null, billId)
        .run();
    }

    if (body.filePath !== undefined || body.fileName !== undefined || body.fileType !== undefined) {
      const filePath = body.filePath || body.fileDataUrl || null;
      const fileType = body.fileType || null;
      const fileName = body.fileName || (typeof filePath === 'string' && !filePath.startsWith('data:') ? filePath.split('/').pop()?.split('?')[0] : null);

      await env.DB.prepare(
        'UPDATE bills SET file_path = ?, file_type = ?, file_name = ?, updated_at = datetime("now") WHERE id = ?'
      )
        .bind(filePath, fileType, fileName, billId)
        .run();
    }

    // Replace full splits array if provided
    if (body.splits && Array.isArray(body.splits)) {
      // Find admin profile for fallback mapping if needed
      const admin = await env.DB.prepare(
        'SELECT p.id FROM profiles p JOIN bills b ON b.household_id = p.household_id WHERE b.id = ? AND p.role = "admin" LIMIT 1'
      ).bind(billId).first();
      const adminId = admin?.id as string | undefined;

      // Delete existing splits for this bill
      await env.DB.prepare('DELETE FROM bill_splits WHERE bill_id = ?').bind(billId).run();

      for (const split of body.splits) {
        let splitProfileId = split.profileId;
        const pExists = await env.DB.prepare('SELECT id FROM profiles WHERE id = ?').bind(splitProfileId).first();

        if (!pExists) {
          if ((splitProfileId === 'user-admin' || !splitProfileId) && adminId) {
            splitProfileId = adminId;
          } else {
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
            billId,
            splitProfileId,
            amount,
            split.percentage,
            split.status || 'pending',
            split.markedPaidAt || split.paidAt || null,
            split.confirmedPaidAt || split.confirmedAt || null,
            split.notes || null
          )
          .run();
      }
    }

    if (body.splitUpdate) {
      const { profileId, status, paidAt, markedPaidAt, confirmedAt, confirmedPaidAt, notes } = body.splitUpdate;
      await env.DB.prepare(
        `UPDATE bill_splits 
         SET status = COALESCE(?, status), 
             paid_at = COALESCE(?, paid_at), 
             confirmed_at = COALESCE(?, confirmed_at),
             notes = COALESCE(?, notes)
         WHERE bill_id = ? AND profile_id = ?`
      )
        .bind(
          status || null,
          markedPaidAt || paidAt || null,
          confirmedPaidAt || confirmedAt || null,
          notes || null,
          billId,
          profileId
        )
        .run();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating bill';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const { params, env } = context;
    const billId = params.id as string;

    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    await env.DB.prepare('DELETE FROM bill_splits WHERE bill_id = ?').bind(billId).run();
    await env.DB.prepare('DELETE FROM bills WHERE id = ?').bind(billId).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error deleting bill';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
