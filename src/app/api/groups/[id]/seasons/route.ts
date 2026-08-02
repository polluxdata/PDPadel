import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { audit } from '@/lib/audit';

// POST /api/groups/[id]/seasons → crear temporada
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();
  const groupId = ctx.params.id;
  const { name, startDate } = (await req.json().catch(() => ({}))) as { name?: string; startDate?: string };

  const { data: group } = await supabase.from('groups').select('admin_id').eq('id', groupId).maybeSingle();
  const [{ data: mine }] = await Promise.all([
    supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).maybeSingle(),
  ]);
  const isOwner = group?.admin_id === user.id;
  const isGroupAdmin = (mine as { role?: string } | null)?.role === 'admin';
  if (user.role !== 'super_admin' && !isOwner && !isGroupAdmin) return unauthorized('No autorizado', 403);

  const { data: season, error: sErr } = await supabase
    .from('seasons')
    .insert({ group_id: groupId, name: name?.trim() || 'Temporada', start_date: startDate || new Date().toISOString().slice(0, 10), created_by: user.id })
    .select('id')
    .single();
  if (sErr) return unauthorized(sErr.message, 500);

  await audit(supabase, { userId: user.id, action: 'create_season', entity: 'season', entityId: season.id, details: { name } });
  return NextResponse.json({ ok: true, season });
}
