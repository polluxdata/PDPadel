import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { magicToken, confirmUrl } from '@/lib/magic';
import { sendEmail } from '@/lib/mail';
import { checkRateLimit } from '@/lib/api/rateLimit';

interface Body {
  email?: string;
  mode?: 'login' | 'signup' | 'invite';
  token?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const email = body.email?.trim().toLowerCase();
  const mode = body.mode === 'signup' ? 'signup' : body.mode === 'invite' ? 'invite' : 'login';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'Ingresa un email válido.' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const supabase = createServiceClient();

  // Rate limit: por email y por IP para evitar abuso de correos.
  if (!(await checkRateLimit(supabase, `magic:${email}`, 3, 60_000))) {
    return NextResponse.json({ ok: false, error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  }
  if (!(await checkRateLimit(supabase, `magicip:${ip}`, 20, 60_000))) {
    return NextResponse.json({ ok: false, error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  }

  const username = body.username?.trim().toLowerCase() ?? '';

  // Para alta: el nombre de usuario es obligatorio y único.
  if (mode === 'signup') {
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { ok: false, error: 'El nombre de usuario debe tener 3–20 caracteres (minúsculas, números, _).' },
        { status: 400 }
      );
    }
    const supabase0 = createServiceClient();
    const { data: taken } = await supabase0
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (taken) {
      return NextResponse.json(
        { ok: false, error: 'Ese nombre de usuario ya existe. Elige otro.' },
        { status: 409 }
      );
    }
  }

  // Invitación: validar el token del enlace compartido y enlazarlo al email.
  let invite: { group_id: string | null; role: string | null } | null = null;
  if (mode === 'invite') {
    const { data: inv } = await supabase
      .from('magic_links')
      .select('*')
      .eq('token', body.token ?? '')
      .eq('purpose', 'invite')
      .eq('used', false)
      .maybeSingle();
    if (!inv || new Date(inv.expires_at) < new Date()) {
      return NextResponse.json(
        { ok: false, error: 'El enlace de invitación no es válido o venció.' },
        { status: 401 }
      );
    }
    invite = { group_id: inv.group_id, role: inv.role };
    await supabase.from('magic_links').update({ used: true }).eq('id', inv.id);
  }

  // Para login, buscamos el usuario; si no existe, avisamos y NO enviamos link.
  let userId: string | null = null;
  const { data: user } = await supabase
    .from('users')
    .select('id, is_active')
    .ilike('email', email)
    .maybeSingle();
  if (user?.is_active) userId = user.id;

  if (mode === 'login' && !userId) {
    return NextResponse.json(
      { ok: false, error: 'Ese email no está registrado.' },
      { status: 404 }
    );
  }

  const payload =
    mode === 'signup'
      ? {
          username,
          firstName: body.firstName ?? '',
          lastName: body.lastName ?? '',
          nickname: null,
        }
      : null;

  const token = magicToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data: ml, error } = await supabase
    .from('magic_links')
    .insert({
      user_id: userId,
      email,
      token,
      purpose: mode,
      group_id: invite?.group_id ?? null,
      role: invite?.role ?? null,
      used: false,
      expires_at: expiresAt,
      payload,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    user_id: userId,
    action: 'request_magic_link',
    entity: 'magic_link',
    entity_id: ml.id,
    details: { mode, email },
  });

  const url = confirmUrl(token);
  const subject =
    mode === 'signup'
      ? 'Confirma tu registro en PolluxPadel'
      : mode === 'invite'
        ? 'Te invitaron a un grupo de PolluxPadel'
        : 'Tu enlace de acceso a PolluxPadel';
  const html = `
    <p>Hola,</p>
    <p>Toca el siguiente enlace para ${mode === 'signup' ? 'completar tu registro' : mode === 'invite' ? 'unirte al grupo' : 'iniciar sesión'} en PolluxPadel:</p>
    <p><a href="${url}">${url}</a></p>
    <p>El enlace vence en 15 minutos y es de un solo uso.</p>
  `;

  try {
    await sendEmail({ to: email, subject, html });
  } catch (err) {
    console.error('[magic] error enviando correo', err);
  }

  return NextResponse.json({ ok: true });
}
