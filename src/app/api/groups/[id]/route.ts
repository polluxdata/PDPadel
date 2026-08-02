import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser } from '@/lib/api/auth';
import { audit } from '@/lib/audit';

const MATCH_SELECT =
  '*, p1:users!matches_player1_id_fkey(*), p2:users!matches_player2_id_fkey(*), p3:users!matches_player3_id_fkey(*), p4:users!matches_player4_id_fkey(*)';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  const supabase = createServiceClient();
  const groupId = ctx.params.id;

  const [{ data: group }, { data: members }, { data: mine }] = await Promise.all([
    supabase.from('groups').select('*').eq('id', groupId).maybeSingle(),
    supabase.from('group_members').select('role, user:users(*)').eq('group_id', groupId),
    supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).maybeSingle(),
  ]);
  if (!group) {
    return NextResponse.json({ ok: false, error: 'Grupo no encontrado' }, { status: 404 });
  }

  const memberRows = ((members ?? []) as unknown as Array<{ role: string; user: Record<string, unknown> | null }>)
    .filter((r) => r.user)
    .map((r) => ({ user: r.user, role: r.role }));

  const { data: season } = await supabase
    .from('seasons')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .maybeSingle();

  let quedadas: Array<Record<string, unknown>> = [];
  let matches: Array<Record<string, unknown>> = [];
  if (season) {
    const { data: qs } = await supabase.from('quedadas').select('*').eq('season_id', season.id);
    quedadas = (qs ?? []) as Array<Record<string, unknown>>;
    if (quedadas.length > 0) {
      const { data: ms } = await supabase
        .from('matches')
        .select(MATCH_SELECT)
        .in('quedada_id', quedadas.map((q) => String(q.id)));
      const modeByQ = new Map(quedadas.map((q) => [String(q.id), q.mode]));
      matches = ((ms ?? []) as Array<Record<string, unknown>>).map((m) => ({
        ...m,
        mode: modeByQ.get(String(m.quedada_id)),
      }));
    }
  }

  const myRole = (mine as { role?: string } | null)?.role ?? null;
  const isOwner = group.admin_id === user.id;

  return NextResponse.json({
    ok: true,
    group,
    members: memberRows,
    myRole,
    isOwner,
    isAdmin: user.role === 'super_admin' || isOwner || myRole === 'admin',
    season: season ?? null,
    quedadas,
    matches,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  const supabase = createServiceClient();
  const groupId = ctx.params.id;

  const { data: group } = await supabase.from('groups').select('admin_id').eq('id', groupId).maybeSingle();
  if (!group) return NextResponse.json({ ok: false, error: 'Grupo no encontrado' }, { status: 404 });
  const isOwner = group.admin_id === user.id;
  if (user.role !== 'super_admin' && !isOwner) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  }

  const { data: updated, error: uErr } = await supabase
    .from('groups')
    .update({ status: 'closed' })
    .eq('id', groupId)
    .select('*')
    .single();
  if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });

  await audit(supabase, { userId: user.id, action: 'close_group', entity: 'group', entityId: groupId });
  return NextResponse.json({ ok: true, group: updated });
}
