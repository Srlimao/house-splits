import { hashPassword, createJwt } from '../_auth';

interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'D1 database binding DB is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { fullName, email, password, inviteCode } = (await request.json()) as {
      fullName?: string;
      email?: string;
      password?: string;
      inviteCode?: string;
    };

    if (!fullName || !email || !password || !inviteCode) {
      return new Response(JSON.stringify({ error: 'All fields including invite code are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = inviteCode.trim().replace(/\s+/g, '').toUpperCase();
    const rawLower = inviteCode.trim().toLowerCase();

    // 1. Verify invite code, household ID, or aliases in D1
    let household = await env.DB.prepare(
      'SELECT id, name FROM households WHERE replace(upper(invite_code), " ", "") = ? OR lower(id) = ?'
    )
      .bind(cleanCode, rawLower)
      .first<{ id: string; name: string }>();

    // Fallback for default aliases (e.g. MAPLE-2026 / HOUSE-2026)
    if (!household && (cleanCode === 'MAPLE-2026' || cleanCode === 'HOUSE-2026')) {
      household = await env.DB.prepare(
        'SELECT id, name FROM households ORDER BY created_at ASC LIMIT 1'
      ).first<{ id: string; name: string }>();
    }

    if (!household) {
      return new Response(
        JSON.stringify({
          error: `Invalid household invite code "${inviteCode}". Please verify with your house admin.`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Check if email already exists
    const existing = await env.DB.prepare('SELECT id FROM profiles WHERE lower(email) = ?')
      .bind(cleanEmail)
      .first();

    if (existing) {
      return new Response(
        JSON.stringify({
          error: 'An account with this email address already exists. Please Sign In instead.',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Hash password and insert profile
    const hashed = await hashPassword(password);
    const newId = crypto.randomUUID();
    const avatarUrl = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80`;

    await env.DB.prepare(
      `INSERT INTO profiles (id, household_id, full_name, email, password_hash, avatar_url, role, is_system_manager, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 'member', 0, 1)`
    )
      .bind(newId, household.id, fullName.trim(), cleanEmail, hashed, avatarUrl)
      .run();

    const userPayload = {
      id: newId,
      email: cleanEmail,
      fullName: fullName.trim(),
      role: 'member',
      isSystemManager: false,
      householdId: household.id,
    };

    const token = await createJwt(userPayload, env.JWT_SECRET);

    return new Response(
      JSON.stringify({
        user: userPayload,
        token,
        householdName: household.name,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `housesplits_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign up failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
