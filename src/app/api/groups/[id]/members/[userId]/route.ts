import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { audit } from '@/lib/audit';

// PATCH /api/groups/[id]/members/[userId]  { role }  → cambiar rol (solo dueño/super)
// DELETE ... → quitar del grupo (admin o super)
export async function PATCH(req: NextRequest, ctx: { params: { id: string; userId: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();
  const { id: groupId, userId } = ctx.params;
  const { role } = (await req.json().catch(() => ({}))) as { role?: string };
  if (role !== 'admin' && role !== 'player') return unauthorized('Rol inválido', 400);

  const { data: group } = await supabase.from('groups').select('admin_id').eq('id', groupId).maybeSingle();
  const isOwner = group?.admin_id === user.id;
  if (user.role !== 'super_admin' && !isOwner) return unauthorized('Solo el dueño puede cambiar roles', 403);
  if (group?.admin_id === userId) return unauthorized('El dueño no se puede demover', 400);

  const { error: uErr } = await supabase
    .from('group_members')
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (uErr) return unauthorized(uErr.message, 500);

  await audit(supabase, { userId: user.id, action: 'change_role', entity: 'group_member', details: { group_id: groupId, user_id: userId, role } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string; userId: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();
  const { id: groupId, userId } = ctx.params;

  const { data: group } = await supabase.from('groups').select('admin_id').eq('id', groupId).maybeSingle();
  const [{ data: mine }] = await Promise.all([
    supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).maybeSingle(),
  ]);
  const isOwner = group?.admin_id === user.id;
  const isGroupAdmin = (mine as { role?: string } | null)?.role === 'admin';
  if (user.role !== 'super_admin' && !isOwner && !isGroupAdmin) return unauthorized('No autorizado', 403);
  if (group?.admin_id === userId) return unauthorized('No se puede quitar al dueño', 400);
  if (userId === user.id) return unauthorized('No puedes salir desde aquí', 400);

  const { error: dErr } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (dErr) return unauthorized(dErr.message, 500);

  await audit(supabase, { userId: user.id, action: 'remove_member', entity: 'group_member', details: { group_id: groupId, user_id: userId } });
  return NextResponse.json({ ok: true });
}
