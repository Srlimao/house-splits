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
