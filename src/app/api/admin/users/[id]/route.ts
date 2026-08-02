import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { audit } from '@/lib/audit';

// DELETE /api/admin/users/[id] → borrar usuario (super admin)
export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  if (user.role !== 'super_admin') return unauthorized('Solo super admin', 403);
  const supabase = createServiceClient();
  const targetId = ctx.params.id;

  if (targetId === user.id) return unauthorized('No puedes borrarte a ti mismo', 400);
  const { data: target } = await supabase.from('users').select('id, role, username').eq('id', targetId).maybeSingle();
  if (!target) return unauthorized('Usuario no encontrado', 404);
  if (target.role === 'super_admin') return unauthorized('No se puede borrar al super admin', 400);

  const { error: dErr } = await supabase.from('users').delete().eq('id', targetId);
  if (dErr) return unauthorized(dErr.message, 500);

  await audit(supabase, { userId: user.id, action: 'delete_user', entity: 'user', entityId: targetId, details: { username: target.username } });
  return NextResponse.json({ ok: true });
}
