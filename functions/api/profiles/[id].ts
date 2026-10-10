interface Env {
  DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const { params, request, env } = context;
    const profileId = params.id as string;
    const body = (await request.json()) as any;

    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    if (body.role !== undefined) {
      const isSys = body.role === 'system_manager';
      if (isSys) {
        await env.DB.prepare(
          'UPDATE profiles SET role = ?, is_system_manager = 1, household_id = NULL, updated_at = datetime("now") WHERE id = ?'
        )
          .bind(body.role, profileId)
          .run();
      } else {
        await env.DB.prepare(
          'UPDATE profiles SET role = ?, is_system_manager = 0, updated_at = datetime("now") WHERE id = ?'
        )
          .bind(body.role, profileId)
          .run();
      }
    }

    if (body.household_id !== undefined) {
      const targetHouse = body.household_id === 'none' ? null : body.household_id;
      // Do not allow setting household_id if current user is system_manager
      const current = await env.DB.prepare('SELECT role FROM profiles WHERE id = ?').bind(profileId).first<{ role: string }>();
      if (current?.role !== 'system_manager') {
        await env.DB.prepare(
          'UPDATE profiles SET household_id = ?, updated_at = datetime("now") WHERE id = ?'
        )
          .bind(targetHouse, profileId)
          .run();
      }
    }

    if (body.full_name !== undefined) {
      await env.DB.prepare(
        'UPDATE profiles SET full_name = ?, updated_at = datetime("now") WHERE id = ?'
      )
        .bind(body.full_name, profileId)
        .run();
    }

    if (body.is_active !== undefined) {
      await env.DB.prepare(
        'UPDATE profiles SET is_active = ?, updated_at = datetime("now") WHERE id = ?'
      )
        .bind(body.is_active ? 1 : 0, profileId)
        .run();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating profile';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const { params, env } = context;
    const profileId = params.id as string;

    if (!env.DB) return new Response(JSON.stringify({ error: 'DB not available' }), { status: 500 });

    // Clean up splits and references
    await env.DB.prepare('DELETE FROM bill_splits WHERE profile_id = ?').bind(profileId).run();
    await env.DB.prepare('DELETE FROM category_split_rules WHERE profile_id = ?').bind(profileId).run();
    await env.DB.prepare('UPDATE bills SET created_by = NULL WHERE created_by = ?').bind(profileId).run();
    await env.DB.prepare('DELETE FROM profiles WHERE id = ?').bind(profileId).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error deleting profile';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
