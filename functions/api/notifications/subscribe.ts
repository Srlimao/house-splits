interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    const body = (await request.json()) as any;
    const { profileId, householdId, subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return new Response(JSON.stringify({ error: 'Invalid push subscription payload' }), { status: 400 });
    }

    if (!profileId) {
      return new Response(JSON.stringify({ error: 'profileId is required' }), { status: 400 });
    }

    const id = crypto.randomUUID();
    const userAgent = request.headers.get('user-agent') || 'Android / Mobile Device';

    // Insert or replace subscription for this endpoint
    await env.DB.prepare(
      `INSERT INTO push_subscriptions (id, profile_id, household_id, endpoint, p256dh, auth, user_agent, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(endpoint) DO UPDATE SET
         profile_id = excluded.profile_id,
         household_id = excluded.household_id,
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         user_agent = excluded.user_agent,
         updated_at = datetime('now')`
    )
      .bind(
        id,
        profileId,
        householdId || null,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        userAgent
      )
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error saving subscription';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    const body = (await request.json()) as any;
    const { endpoint } = body;

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'endpoint is required' }), { status: 400 });
    }

    await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error removing subscription';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
