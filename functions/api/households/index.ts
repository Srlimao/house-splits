interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB binding not available' }), { status: 500 });
    }

    const { results } = await env.DB.prepare(
      'SELECT id, name, currency, invite_code, admin_payment_info, webhook_settings, created_at FROM households ORDER BY created_at DESC'
    ).all();

    const formatted = (results || []).map((h: any) => ({
      ...h,
      admin_payment_info: typeof h.admin_payment_info === 'string' ? JSON.parse(h.admin_payment_info || '{}') : h.admin_payment_info,
      webhook_settings: typeof h.webhook_settings === 'string' ? JSON.parse(h.webhook_settings || '{}') : h.webhook_settings,
    }));

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching households';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'DB binding not available' }), { status: 500 });
    }

    const body = (await request.json()) as {
      name?: string;
      currency?: string;
      invite_code?: string;
    };

    if (!body.name) {
      return new Response(JSON.stringify({ error: 'Household name is required' }), { status: 400 });
    }

    const id = crypto.randomUUID();
    const currency = body.currency || 'EUR';
    const inviteCode = body.invite_code?.trim().toUpperCase() || `HOUSE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await env.DB.prepare(
      `INSERT INTO households (id, name, currency, invite_code, admin_payment_info, webhook_settings)
       VALUES (?, ?, ?, ?, '{}', '{}')`
    )
      .bind(id, body.name.trim(), currency, inviteCode)
      .run();

    // Seed default categories
    const categories = [
      { id: crypto.randomUUID(), name: 'Rent', code: 'rent', icon: 'home', color_hex: '#6366f1' },
      { id: crypto.randomUUID(), name: 'Electricity', code: 'electricity', icon: 'zap', color_hex: '#f59e0b' },
      { id: crypto.randomUUID(), name: 'Water', code: 'water', icon: 'droplet', color_hex: '#3b82f6' },
      { id: crypto.randomUUID(), name: 'Internet', code: 'internet', icon: 'wifi', color_hex: '#8b5cf6' },
      { id: crypto.randomUUID(), name: 'Gas', code: 'gas', icon: 'flame', color_hex: '#ef4444' },
    ];

    for (const cat of categories) {
      await env.DB.prepare(
        'INSERT INTO bill_categories (id, household_id, name, code, icon, color_hex) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(cat.id, id, cat.name, cat.code, cat.icon, cat.color_hex)
        .run();
    }

    return new Response(
      JSON.stringify({
        id,
        name: body.name.trim(),
        currency,
        invite_code: inviteCode,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating household';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
