interface Env {
  DB: D1Database;
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const { params, env } = context;
    const householdId = params.id as string;

    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    // In SQLite, cascade delete bills, categories, and decouple members
    await env.DB.prepare('DELETE FROM bills WHERE household_id = ?').bind(householdId).run();
    await env.DB.prepare('DELETE FROM bill_categories WHERE household_id = ?').bind(householdId).run();
    await env.DB.prepare('UPDATE profiles SET household_id = NULL WHERE household_id = ?').bind(householdId).run();
    await env.DB.prepare('DELETE FROM households WHERE id = ?').bind(householdId).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error deleting household';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const { params, request, env } = context;
    const householdId = params.id as string;
    const updates = (await request.json()) as any;

    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    if (updates.name) {
      await env.DB.prepare('UPDATE households SET name = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(updates.name, householdId)
        .run();
    }
    if (updates.currency) {
      await env.DB.prepare('UPDATE households SET currency = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(updates.currency, householdId)
        .run();
    }
    if (updates.invite_code) {
      await env.DB.prepare('UPDATE households SET invite_code = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(updates.invite_code, householdId)
        .run();
    }
    if (updates.admin_payment_info) {
      const infoStr = typeof updates.admin_payment_info === 'string' ? updates.admin_payment_info : JSON.stringify(updates.admin_payment_info);
      await env.DB.prepare('UPDATE households SET admin_payment_info = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(infoStr, householdId)
        .run();
    }
    if (updates.webhook_settings) {
      const hookStr = typeof updates.webhook_settings === 'string' ? updates.webhook_settings : JSON.stringify(updates.webhook_settings);
      await env.DB.prepare('UPDATE households SET webhook_settings = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(hookStr, householdId)
        .run();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating household';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
