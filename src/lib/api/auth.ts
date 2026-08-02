import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { SESSION_COOKIE } from '@/middleware';
import type { PublicUser } from '@/lib/types';

export const SESSION_DAYS = 30;

const PUBLIC_SELECT = 'id, username, first_name, last_name, email, nickname, role, listed, is_active, created_by, created_at, updated_at';

export type AuthResult =
  | { user: PublicUser; error: null }
  | { user: null; error: { message: string; status: number } };

type ServiceClient = ReturnType<typeof createServiceClient>;

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// Crea una sesión (token aleatorio a la cookie; hash en BD). Devuelve el token.
export async function createSession(supabase: ServiceClient, userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from('sessions').insert({
    user_id: userId,
    token_hash: sha256(token),
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);
  return token;
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function revokeSession(supabase: ServiceClient, token: string) {
  if (!token) return;
  await supabase.from('sessions').update({ revoked: true }).eq('token_hash', sha256(token));
}

// Valida la cookie (token de sesión) y devuelve el usuario.
export async function requireUser(req: NextRequest): Promise<AuthResult> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return { user: null, error: { message: 'No autorizado', status: 401 } };
  }
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('sessions')
    .select(`revoked, expires_at, user:users(${PUBLIC_SELECT})`)
    .eq('token_hash', sha256(token))
    .maybeSingle();

  const sess = data as unknown as {
    revoked: boolean;
    expires_at: string;
    user: PublicUser | null;
  } | null;

  if (!sess || sess.revoked || !sess.user || !sess.user.is_active || new Date(sess.expires_at) < new Date()) {
    return { user: null, error: { message: 'Sesión inválida o expirada', status: 401 } };
  }

  // Renovación deslizante ligera: refresca last_used_at (best effort).
  supabase.from('sessions').update({ last_used_at: new Date().toISOString() }).eq('token_hash', sha256(token)).then(() => {});

  return { user: sess.user, error: null };
}

// Rol por grupo de un usuario (owner o membresía).
export async function getGroupRole(supabase: ServiceClient, groupId: string, userId: string) {
  const [{ data: group }, { data: mine }] = await Promise.all([
    supabase.from('groups').select('admin_id').eq('id', groupId).maybeSingle(),
    supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  const isOwner = group?.admin_id === userId;
  const membershipRole = (mine as { role?: string } | null)?.role ?? null;
  return { isOwner, membershipRole };
}

export function unauthorized(message = 'No autorizado', status = 401) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
