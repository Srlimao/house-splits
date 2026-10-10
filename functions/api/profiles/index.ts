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
      const res = await env.DB.prepare(`${query} WHERE household_id = ? ORDER BY created_at ASC`)
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
