import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { audit } from '@/lib/audit';
import { magicToken, confirmUrl } from '@/lib/magic';
import { sendEmail } from '@/lib/mail';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// POST /api/admin/users → alta directa de usuario (solo super admin).
// Pensado para jugadores que no pueden registrarse solos: el admin captura
// nombre, usuario y email; opcionalmente les envía un enlace de acceso.
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  if (user.role !== 'super_admin') return unauthorized('Solo super admin', 403);
  const supabase = createServiceClient();

  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    notify?: boolean;
  };
  const username = body.username?.trim().toLowerCase() ?? '';
  const email = body.email?.trim().toLowerCase() ?? '';
  const firstName = body.firstName?.trim() ?? '';
  const lastName = body.lastName?.trim() ?? '';

  if (!USERNAME_RE.test(username)) {
    return unauthorized('El nombre de usuario debe tener 3–20 caracteres (minúsculas, números, _).', 400);
  }
  if (!EMAIL_RE.test(email)) return unauthorized('Ingresa un email válido.', 400);
  if (!firstName) return unauthorized('El nombre es obligatorio.', 400);

  const [{ data: takenU }, { data: takenE }] = await Promise.all([
    supabase.from('users').select('id').eq('username', username).maybeSingle(),
    supabase.from('users').select('id').ilike('email', email).maybeSingle(),
  ]);
  if (takenU) return unauthorized('Ese nombre de usuario ya existe.', 409);
  if (takenE) return unauthorized('Ese email ya está registrado.', 409);

  const { data: created, error: iErr } = await supabase
    .from('users')
    .insert({
      username,
      email,
      first_name: firstName,
      last_name: lastName,
      nickname: null,
      role: 'player',
      pin_hash: null,
      listed: true,
      is_active: true,
      created_by: user.id,
    })
    .select('*')
    .single();
  if (iErr || !created) return unauthorized(iErr?.message ?? 'No se pudo crear el usuario.', 500);

  // Enlace de acceso por correo: al abrirlo se confirma el email y queda
  // logueado (15 min, un solo uso). Un fallo del correo no invalida el alta.
  let notified = false;
  if (body.notify !== false) {
    try {
      const token = magicToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabase.from('magic_links').insert({
        user_id: created.id,
        email,
        token,
        purpose: 'login',
        used: false,
        expires_at: expiresAt,
      });
      const url = confirmUrl(token);
      await sendEmail({
        to: email,
        subject: 'Te dieron de alta en PolluxPadel',
        html: `
          <p>Hola ${firstName},</p>
          <p>Te dieron de alta en <b>PolluxPadel</b>. Toca el siguiente enlace para entrar:</p>
          <p><a href="${url}">${url}</a></p>
          <p>El enlace vence en 15 minutos y es de un solo uso. Si se te vence,
          puedes pedir otro desde la pantalla de acceso con tu correo (${email}).</p>
        `,
      });
      notified = true;
    } catch (err) {
      console.error('[admin/users] fallo enviando correo de bienvenida', err);
    }
  }

  await audit(supabase, {
    userId: user.id,
    action: 'create_user',
    entity: 'user',
    entityId: created.id,
    details: { username, email, notified },
  });
  return NextResponse.json({ ok: true, user: created, notified });
}
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  if (user.role !== 'super_admin') return unauthorized('Solo super admin', 403);
  const supabase = createServiceClient();

  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? 1));
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const filter = req.nextUrl.searchParams.get('filter') ?? 'all';
  const PAGE_SIZE = 20;

  let idFilter: string[] | null = null;
  if (filter === 'group_admin' || filter === 'no_groups') {
    const { data: admins } = await supabase.from('group_members').select('user_id').eq('role', 'admin');
    const adminIds = new Set((admins ?? []).map((r) => (r as { user_id: string }).user_id));
    if (filter === 'group_admin') {
      idFilter = Array.from(adminIds);
      if (idFilter.length === 0) return NextResponse.json({ ok: true, users: [], memberships: {}, total: 0 });
    } else {
      const all = await supabase.from('group_members').select('user_id');
      idFilter = Array.from(new Set((all.data ?? []).map((r) => (r as { user_id: string }).user_id)));
    }
  }

  let builder = supabase.from('users').select('*', { count: 'exact' });
  if (q) builder = builder.or(`username.ilike.%${q}%,email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  if (filter === 'super') builder = builder.eq('role', 'super_admin');
  else if (filter === 'group_admin' && idFilter) builder = builder.in('id', idFilter);
  else if (filter === 'no_groups' && idFilter) builder = builder.not('id', 'in', `(${idFilter.join(',')})`);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await builder.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
  const users = (data ?? []) as Array<Record<string, unknown>>;

  const memberships: Record<string, { adminIn: string[]; playerIn: string[] }> = {};
  if (users.length > 0) {
    const { data: ms } = await supabase
      .from('group_members')
      .select('user_id, role, group:groups(name)')
      .in('user_id', users.map((u) => String(u.id)));
    for (const r of (ms ?? []) as unknown as Array<{ user_id: string; role: string; group: { name: string } | null }>) {
      if (!r.group) continue;
      if (!memberships[r.user_id]) memberships[r.user_id] = { adminIn: [], playerIn: [] };
      if (r.role === 'admin') memberships[r.user_id].adminIn.push(r.group.name);
      else memberships[r.user_id].playerIn.push(r.group.name);
    }
  }

  return NextResponse.json({ ok: true, users, memberships, total: count ?? 0, page });
}
