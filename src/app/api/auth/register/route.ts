import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';
import { dailyToken } from '@/lib/token';
import type { UserRole } from '@/lib/types';

interface Body {
  code?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  nickname?: string;
  pin?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const { code, username, firstName, lastName, email, nickname, pin } = body;

  if (!code || !username || !pin) {
    return NextResponse.json(
      { ok: false, error: 'Completa código, usuario y PIN.' },
      { status: 400 }
    );
  }
  if (pin.length < 4) {
    return NextResponse.json(
      { ok: false, error: 'El PIN debe tener al menos 4 caracteres.' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Nombre de usuario único.
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .ilike('username', username.trim());
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { ok: false, error: 'Ese nombre de usuario ya está en uso.' },
      { status: 409 }
    );
  }

  // Validar código: token diario del super admin o PIN emitido.
  let role: UserRole = 'player';
  let groupId: string | null = null;
  let issuedBy: string | null = null;
  let isPin = false;

  if (code === dailyToken()) {
    role = 'player';
  } else {
    const { data: reg } = await supabase
      .from('registration_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .limit(1);
    const valid = reg && reg.length > 0;
    const rc = valid ? reg![0] : null;
    const notExpired = !rc?.expires_at || new Date(rc.expires_at) > new Date();

    if (!rc || !notExpired) {
      return NextResponse.json(
        { ok: false, error: 'Código de registro inválido o ya utilizado.' },
        { status: 401 }
      );
    }
    isPin = true;
    role = rc.role;
    groupId = rc.group_id ?? null;
    issuedBy = rc.issued_by ?? null;
  }

  const pin_hash = await bcrypt.hash(pin, 10);
  const { data: created, error } = await supabase
    .from('users')
    .insert({
      username: username.trim().toLowerCase(),
      pin_hash,
      first_name: firstName ?? '',
      last_name: lastName ?? '',
      email: email || null,
      nickname: nickname || null,
      role,
      created_by: isPin ? issuedBy : null,
    })
    .select('id, username, role')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Si el código era un PIN de grupo, lo agrega al grupo automáticamente.
  if (isPin && groupId) {
    await supabase
      .from('group_members')
      .upsert({ group_id: groupId, user_id: created.id }, { onConflict: 'group_id,user_id' });
    await supabase.from('registration_codes').update({ used: true }).eq('code', code);
  }

  await supabase.from('audit_log').insert({
    user_id: created.id,
    action: 'register',
    entity: 'user',
    entity_id: created.id,
    details: { username: created.username, role, group_id: groupId, via_pin: isPin },
  });

  return NextResponse.json({ ok: true, user: created });
}
