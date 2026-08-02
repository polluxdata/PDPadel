import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { audit } from '@/lib/audit';

async function canManage(supabase: ReturnType<typeof createServiceClient>, groupId: string, userId: string) {
  const [{ data: group }, { data: mine }] = await Promise.all([
    supabase.from('groups').select('admin_id').eq('id', groupId).maybeSingle(),
    supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', userId).maybeSingle(),
  ]);
  const isOwner = group?.admin_id === userId;
  return { isOwner, isGroupAdmin: (mine as { role?: string } | null)?.role === 'admin', group };
}

// POST /api/groups/[id]/members  { userId } → agregar como jugador
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();
  const groupId = ctx.params.id;
  const { userId } = (await req.json().catch(() => ({}))) as { userId?: string };

  if (!userId) return unauthorized('Falta el usuario', 400);

  const meRole = await canManage(supabase, groupId, user.id);
  if (user.role !== 'super_admin' && !meRole.isOwner && !meRole.isGroupAdmin) {
    return unauthorized('No eres admin de ese grupo', 403);
  }

  const { error: iErr } = await supabase
    .from('group_members')
    .upsert({ group_id: groupId, user_id: userId, role: 'player' }, { onConflict: 'group_id,user_id' });
  if (iErr) return unauthorized(iErr.message, 500);

  await audit(supabase, { userId: user.id, action: 'add_member', entity: 'group_member', details: { group_id: groupId, user_id: userId } });
  return NextResponse.json({ ok: true });
}
