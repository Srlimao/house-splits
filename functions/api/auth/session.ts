import { verifyJwt, parseCookies } from '../_auth';

interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const cookies = parseCookies(request.headers.get('Cookie'));
    const authHeader = request.headers.get('Authorization');
    
    let token = cookies['housesplits_session'];
    if (!token && authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload?.id) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Refresh profile state from D1
    if (env.DB) {
      const dbProfile = await env.DB.prepare(
        'SELECT id, household_id, full_name, email, role, is_system_manager, avatar_url FROM profiles WHERE id = ?'
      )
        .bind(payload.id as string)
        .first<{
          id: string;
          household_id: string | null;
          full_name: string;
          email: string;
          role: string;
          is_system_manager: number;
          avatar_url: string;
        }>();

      if (dbProfile) {
        return new Response(
          JSON.stringify({
            user: {
              id: dbProfile.id,
              email: dbProfile.email,
              fullName: dbProfile.full_name,
              role: dbProfile.role,
              isSystemManager: Boolean(dbProfile.is_system_manager),
              householdId: dbProfile.household_id,
              avatarUrl: dbProfile.avatar_url,
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(JSON.stringify({ user: payload }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
