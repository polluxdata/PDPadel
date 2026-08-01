import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SESSION_COOKIE } from '@/middleware';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const supabase = createClient();

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Falta el token.' }, { status: 400 });
  }

  const { data: ml } = await supabase
    .from('magic_links')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!ml || ml.used || new Date(ml.expires_at) < new Date()) {
    return NextResponse.json(
      { ok: false, error: 'Este enlace ya fue usado o venció. Pide uno nuevo.' },
      { status: 401 }
    );
  }

  await supabase.from('magic_links').update({ used: true }).eq('id', ml.id);

  let userId = ml.user_id;

  // Alta: crear el usuario si no existe (signup / invitación a un email nuevo).
  if (!userId) {
    const payload = (ml.payload ?? {}) as Record<string, unknown>;
    const chosen = String(payload.username ?? '').toLowerCase();
    // Usar el usuario elegido en el alta; si por una carrera ya existe, añadir sufijo.
    const base = USERNAME_RE.test(chosen)
      ? chosen
      : ml.email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase() || 'user';
    let username = base;
    let n = 1;
    for (;;) {
      const { data: exists } = await supabase
        .from('users')
        .select('id')
        .eq('username', username);
      if (!exists || exists.length === 0) break;
      username = `${base}${n++}`;
    }
    const { data: nu, error } = await supabase
      .from('users')
      .insert({
        username,
        email: ml.email,
        first_name: String(payload.firstName ?? ''),
        last_name: String(payload.lastName ?? ''),
        nickname: payload.nickname ? String(payload.nickname) : null,
        role: 'player',
        created_by: ml.user_id ?? null,
      })
      .select('id')
      .single();

    if (error || !nu) {
      return NextResponse.json({ ok: false, error: 'No se pudo crear la cuenta.' }, { status: 500 });
    }
    userId = nu.id;
  }

  // Invitación a grupo: agregar con el rol del enlace.
  if (ml.purpose === 'invite' && ml.group_id) {
    await supabase
      .from('group_members')
      .upsert(
        { group_id: ml.group_id, user_id: userId, role: ml.role ?? 'player' },
        { onConflict: 'group_id,user_id' }
      );
    await supabase.from('audit_log').insert({
      user_id: userId,
      action: 'accept_invite',
      entity: 'group_member',
      details: { group_id: ml.group_id, role: ml.role },
    });
  }

  await supabase.from('audit_log').insert({
    user_id: userId,
    action: 'magic_link_login',
    entity: 'user',
    entity_id: userId,
    details: { purpose: ml.purpose },
  });

  const redirectTo =
    ml.purpose === 'invite' && ml.group_id ? `/groups/${ml.group_id}` : '/';

  const res = NextResponse.json({ ok: true, redirectTo });
  res.cookies.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
