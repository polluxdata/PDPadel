import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { audit } from '@/lib/audit';
import { computeSeasonRanking } from '@/lib/points';

const MATCH_SELECT =
  '*, p1:users!matches_player1_id_fkey(*), p2:users!matches_player2_id_fkey(*), p3:users!matches_player3_id_fkey(*), p4:users!matches_player4_id_fkey(*)';

// GET /api/seasons/[id] → detalle (grupo, membresías, quedadas, partidos, ranking)
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();
  const seasonId = ctx.params.id;

  const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).maybeSingle();
  if (!season) return unauthorized('Temporada no encontrada', 404);

  const [{ data: group }, { data: members }, { data: qs }, { data: mine }] = await Promise.all([
    supabase.from('groups').select('*').eq('id', season.group_id).maybeSingle(),
    supabase.from('group_members').select('role, user:users(*)').eq('group_id', season.group_id),
    supabase.from('quedadas').select('*').eq('season_id', seasonId).order('created_at'),
    supabase.from('group_members').select('role').eq('group_id', season.group_id).eq('user_id', user.id).maybeSingle(),
  ]);

  const memberRows = ((members ?? []) as unknown as Array<{ role: string; user: Record<string, unknown> | null }>)
    .filter((r) => r.user)
    .map((r) => ({ user: r.user, role: r.role }));

  const quedadas = (qs ?? []) as Array<Record<string, unknown>>;
  let matches: Array<Record<string, unknown>> = [];
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

  const ranking = computeSeasonRanking(
    memberRows.map((r) => r.user as never),
    matches as never
  );

  const myRole = (mine as { role?: string } | null)?.role ?? null;
  return NextResponse.json({
    ok: true,
    season,
    group,
    members: memberRows,
    myRole,
    isAdmin: user.role === 'super_admin' || group?.admin_id === user.id || myRole === 'admin',
    quedadas,
    matches,
    ranking,
  });
}

// POST /api/seasons/[id]/close → cerrar temporada (calcula ganador)
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();
  const seasonId = ctx.params.id;

  const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).maybeSingle();
  if (!season) return unauthorized('Temporada no encontrada', 404);

  const { data: group } = await supabase.from('groups').select('admin_id').eq('id', season.group_id).maybeSingle();
  const [{ data: mine }] = await Promise.all([
    supabase.from('group_members').select('role').eq('group_id', season.group_id).eq('user_id', user.id).maybeSingle(),
  ]);
  const isOwner = group?.admin_id === user.id;
  const isGroupAdmin = (mine as { role?: string } | null)?.role === 'admin';
  if (user.role !== 'super_admin' && !isOwner && !isGroupAdmin) return unauthorized('No autorizado', 403);

  const { data: active } = await supabase
    .from('quedadas')
    .select('id')
    .eq('season_id', seasonId)
    .eq('status', 'active');
  if (active && active.length > 0) {
    return unauthorized('Aún hay quedadas activas. Finalízalas primero.', 400);
  }

  const { data: members } = await supabase
    .from('group_members')
    .select('user:users(*)')
    .eq('group_id', season.group_id);
  const users = ((members ?? []) as unknown as Array<{ user: Record<string, unknown> | null }>)
    .map((r) => r.user)
    .filter(Boolean);
  const { data: qs } = await supabase.from('quedadas').select('*').eq('season_id', seasonId);
  const quedadas = (qs ?? []) as Array<Record<string, unknown>>;
  let matches: Array<Record<string, unknown>> = [];
  if (quedadas.length > 0) {
    const { data: ms2 } = await supabase.from('matches').select(MATCH_SELECT).in('quedada_id', quedadas.map((q) => String(q.id)));
    const modeByQ = new Map(quedadas.map((q) => [String(q.id), q.mode]));
    matches = ((ms2 ?? []) as Array<Record<string, unknown>>).map((m) => ({ ...m, mode: modeByQ.get(String(m.quedada_id)) }));
  }
  const ranking = computeSeasonRanking(users as never, matches as never);
  const champion = ranking[0]?.userId ?? null;

  const { data: updated, error: uErr } = await supabase
    .from('seasons')
    .update({ status: 'closed', end_date: new Date().toISOString().slice(0, 10), winner_id: champion })
    .eq('id', seasonId)
    .select('*')
    .single();
  if (uErr) return unauthorized(uErr.message, 500);

  await audit(supabase, { userId: user.id, action: 'close_season', entity: 'season', entityId: seasonId, details: { winner_id: champion } });
  return NextResponse.json({ ok: true, season: updated, winner: champion });
}
