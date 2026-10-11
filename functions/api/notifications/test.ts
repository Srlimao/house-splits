import { sendWebPush } from '../_webpush';

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    const body = (await request.json()) as any;
    const { profileId } = body;

    if (!profileId) {
      return new Response(JSON.stringify({ error: 'profileId is required' }), { status: 400 });
    }

    const { results } = await env.DB.prepare(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE profile_id = ?'
    )
      .bind(profileId)
      .all();

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active push subscriptions found for this profile. Please enable notifications on this device first.' }),
        { status: 404 }
      );
    }

    const payload = {
      title: '🏠 HouseSplits Android Alert',
      body: 'Notifications are working! You will receive bill reminders 5 days and 1 day before due dates.',
      url: '/',
    };

    let sent = 0;
    for (const sub of results as any[]) {
      const res = await sendWebPush(sub, payload);
      if (res.success) {
        sent++;
      } else if (res.gone) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(sub.endpoint).run();
      }
    }

    return new Response(
      JSON.stringify({ success: true, sentCount: sent, totalDevices: results.length }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error sending test notification';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
