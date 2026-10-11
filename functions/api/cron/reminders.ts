import { sendWebPush } from '../_webpush';

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const { env } = context;
    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    // Calculate target dates in YYYY-MM-DD format (local and UTC)
    const now = new Date();
    const plus5 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const plus1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Query pending/unsettled splits for bills due in 5 days or 1 day
    const { results } = await env.DB.prepare(
      `SELECT b.id as bill_id, b.household_id, b.provider_name, b.due_date, b.total_amount, b.currency,
              s.id as split_id, s.profile_id, s.amount, s.status,
              p.full_name, p.email,
              h.name as household_name, h.webhook_settings
       FROM bills b
       JOIN bill_splits s ON b.id = s.bill_id
       JOIN profiles p ON s.profile_id = p.id
       JOIN households h ON b.household_id = h.id
       WHERE (b.due_date = ? OR b.due_date = ? OR b.due_date = date('now', '+5 days') OR b.due_date = date('now', '+1 day'))
         AND s.status != 'confirmed_by_admin'`
    )
      .bind(plus5, plus1)
      .all();

    const pendingSplits = (results || []) as any[];
    let pushNotificationsSent = 0;
    const remindersSent: any[] = [];
    const expiredSubscriptions: string[] = [];

    for (const split of pendingSplits) {
      const isDueTomorrow = split.due_date === plus1;
      const daysText = isDueTomorrow ? 'due tomorrow' : 'due in 5 days';
      const currencySymbol = split.currency === 'USD' ? '$' : '€';
      const amountStr = `${currencySymbol}${Number(split.amount || 0).toFixed(2)}`;

      const title = isDueTomorrow
        ? `⚠️ ${split.provider_name} due tomorrow!`
        : `🔔 ${split.provider_name} due in 5 days`;

      const body = `Hi ${split.full_name?.split(' ')[0] || 'Roommate'}, your share of ${amountStr} is ${daysText} (${split.due_date}).`;

      // Find push subscriptions for this roommate
      const { results: subs } = await env.DB.prepare(
        'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE profile_id = ?'
      )
        .bind(split.profile_id)
        .all();

      if (subs && subs.length > 0) {
        for (const sub of subs as any[]) {
          const pushRes = await sendWebPush(sub, {
            title,
            body,
            url: `/?billId=${split.bill_id}`,
            billId: split.bill_id,
          });

          if (pushRes.success) {
            pushNotificationsSent++;
            remindersSent.push({
              recipient: split.full_name,
              bill: split.provider_name,
              dueDate: split.due_date,
              daysLeft: isDueTomorrow ? 1 : 5,
            });
          } else if (pushRes.gone) {
            expiredSubscriptions.push(sub.endpoint);
          }
        }
      }
    }

    // Clean up expired push subscriptions
    if (expiredSubscriptions.length > 0) {
      for (const endpoint of expiredSubscriptions) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkedAt: new Date().toISOString(),
        pendingSplitsEvaluated: pendingSplits.length,
        pushNotificationsSent,
        remindersSent,
        expiredSubscriptionsCleaned: expiredSubscriptions.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error processing reminders';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
