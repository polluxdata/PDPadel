import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';
import { SESSION_COOKIE } from '@/middleware';
import type { PublicUser } from '@/lib/types';

function toPublic(u: PublicUser & { pin_hash?: string | null }): PublicUser {
  return {
    id: u.id,
    username: u.username,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    nickname: u.nickname,
    role: u.role,
    is_active: u.is_active,
    created_by: u.created_by,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

export async function POST(req: NextRequest) {
  const { username, pin } = (await req.json().catch(() => ({}))) as {
    username?: string;
    pin?: string;
  };

  if (!username || !pin) {
    return NextResponse.json({ ok: false, error: 'Ingresa usuario y PIN.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', username.trim())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Usuario o PIN incorrecto.' }, { status: 401 });
  }
  if (!user.is_active) {
    return NextResponse.json({ ok: false, error: 'Usuario desactivado.' }, { status: 403 });
  }
  if (!user.pin_hash) {
    return NextResponse.json(
      { ok: false, error: 'Este usuario entra con correo (magic link).' },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(pin, user.pin_hash);
  if (!valid) {
    return NextResponse.json({ ok: false, error: 'Usuario o PIN incorrecto.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, user: toPublic(user) });
  res.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: 'login',
    entity: 'user',
    entity_id: user.id,
  });

  return res;
}
