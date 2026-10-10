import { verifyPassword, createJwt } from '../_auth';

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

    const { email, password } = (await request.json()) as { email?: string; password?: string };

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const profile = await env.DB.prepare(
      'SELECT id, household_id, full_name, email, password_hash, role, is_system_manager, avatar_url FROM profiles WHERE lower(email) = ?'
    )
      .bind(normalizedEmail)
      .first<{
        id: string;
        household_id: string | null;
        full_name: string;
        email: string;
        password_hash: string;
        role: string;
        is_system_manager: number;
        avatar_url: string;
      }>();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isMatch = await verifyPassword(password, profile.password_hash);
    if (!isMatch) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userPayload = {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      isSystemManager: Boolean(profile.is_system_manager),
      householdId: profile.household_id,
    };

    const token = await createJwt(userPayload, env.JWT_SECRET);

    return new Response(
      JSON.stringify({
        user: userPayload,
        token,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `housesplits_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
