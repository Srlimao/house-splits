interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    const url = new URL(request.url);
    const householdId = url.searchParams.get('household_id');

    let query = 'SELECT id, household_id, name, code, icon, color_hex, created_at FROM bill_categories';
    let results: any[];

    if (householdId) {
      const res = await env.DB.prepare(
        `${query} WHERE household_id = ? ORDER BY created_at ASC`
      )
        .bind(householdId)
        .all();
      results = res.results || [];
    } else {
      const res = await env.DB.prepare(`${query} ORDER BY created_at ASC`).all();
      results = res.results || [];
    }

    // If household has no categories yet and a householdId was provided, seed default categories
    if (results.length === 0 && householdId) {
      const defaultCategories = [
        { id: crypto.randomUUID(), name: 'Rent', code: 'rent', icon: 'home', colorHex: '#6366f1' },
        { id: crypto.randomUUID(), name: 'Electricity', code: 'electricity', icon: 'zap', colorHex: '#f59e0b' },
        { id: crypto.randomUUID(), name: 'Water', code: 'water', icon: 'droplet', colorHex: '#3b82f6' },
        { id: crypto.randomUUID(), name: 'Internet', code: 'internet', icon: 'wifi', colorHex: '#8b5cf6' },
        { id: crypto.randomUUID(), name: 'Gas', code: 'gas', icon: 'flame', colorHex: '#ef4444' },
      ];

      for (const cat of defaultCategories) {
        await env.DB.prepare(
          'INSERT INTO bill_categories (id, household_id, name, code, icon, color_hex) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind(cat.id, householdId, cat.name, cat.code, cat.icon, cat.colorHex)
          .run();
      }

      results = defaultCategories.map((c) => ({
        id: c.id,
        household_id: householdId,
        name: c.name,
        code: c.code,
        icon: c.icon,
        color_hex: c.colorHex,
      }));
    }

    const mapped = (results || []).map((c: any) => ({
      id: c.id,
      householdId: c.household_id,
      name: c.name,
      code: c.code,
      icon: c.icon,
      colorHex: c.color_hex,
      createdAt: c.created_at,
    }));

    return new Response(JSON.stringify(mapped), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching categories';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
