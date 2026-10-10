interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    const url = new URL(request.url);
    const householdId = url.searchParams.get('household_id');

    let query = 'SELECT id, household_id, full_name, nickname, email, avatar_url, role, is_system_manager, is_active, created_at FROM profiles';
    let results: any[];

    if (householdId) {
      const res = await env.DB.prepare(
        `${query} WHERE household_id = ? AND role != 'system_manager' AND is_system_manager = 0 ORDER BY created_at ASC`
      )
        .bind(householdId)
        .all();
      results = res.results || [];
    } else {
      const res = await env.DB.prepare(`${query} ORDER BY created_at DESC`).all();
      results = res.results || [];
    }

    const mapped = results.map((p) => ({
      id: p.id,
      householdId: p.household_id,
      fullName: p.full_name,
      nickname: p.nickname,
      email: p.email,
      avatarUrl: p.avatar_url,
      role: p.role,
      isSystemManager: Boolean(p.is_system_manager),
      isActive: Boolean(p.is_active),
      createdAt: p.created_at,
    }));

    return new Response(JSON.stringify(mapped), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching profiles';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    const body = (await request.json()) as any;
    const id = body.id || crypto.randomUUID();
    const householdId = body.household_id || body.householdId || null;
    const fullName = body.full_name || body.fullName || 'Roommate';
    const email = body.email || `${id.substring(0, 8)}@example.com`;
    const role = body.role || 'member';
    const isSys = role === 'system_manager' ? 1 : 0;
    const avatarUrl = body.avatar_url || body.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80';

    await env.DB.prepare(
      `INSERT INTO profiles (id, household_id, full_name, email, role, is_system_manager, avatar_url, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    )
      .bind(id, isSys ? null : householdId, fullName, email, role, isSys, avatarUrl)
      .run();

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating profile';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
