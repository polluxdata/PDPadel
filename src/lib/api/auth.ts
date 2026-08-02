import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { SESSION_COOKIE } from '@/middleware';
import type { PublicUser } from '@/lib/types';

const PUBLIC_SELECT = 'id, username, first_name, last_name, email, nickname, role, listed, is_active, created_by, created_at, updated_at';

export type AuthResult =
  | { user: PublicUser; error: null }
  | { user: null; error: { message: string; status: number } };

// Valida la cookie de sesión y devuelve el usuario (o error 401/403).
export async function requireUser(req: NextRequest): Promise<AuthResult> {
  const uid = req.cookies.get(SESSION_COOKIE)?.value;
  if (!uid) {
    return { user: null, error: { message: 'No autorizado', status: 401 } };
  }
  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select(PUBLIC_SELECT)
    .eq('id', uid)
    .maybeSingle();
  if (!user || !user.is_active) {
    return { user: null, error: { message: 'Sesión inválida', status: 401 } };
  }
  return { user: user as PublicUser, error: null };
}

// Rol por grupo de un usuario (owner o membresía).
export async function getGroupRole(supabase: ReturnType<typeof createServiceClient>, groupId: string, userId: string) {
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
