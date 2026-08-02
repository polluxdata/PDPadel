import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { audit } from '@/lib/audit';

const MATCH_SELECT =
  '*, p1:users!matches_player1_id_fkey(*), p2:users!matches_player2_id_fkey(*), p3:users!matches_player3_id_fkey(*), p4:users!matches_player4_id_fkey(*)';

// GET /api/quedadas/[id] → detalle de quedada
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();
  const qid = ctx.params.id;

  const [{ data: quedada }, { data: matches }, { data: players }] = await Promise.all([
    supabase.from('quedadas').select('*').eq('id', qid).maybeSingle(),
    supabase.from('matches').select(MATCH_SELECT).eq('quedada_id', qid).order('round_number').order('court_number'),
    supabase.from('quedada_players').select('user:users(*)').eq('quedada_id', qid),
  ]);
  if (!quedada) return unauthorized('Quedada no encontrada', 404);

  const playerRows = ((players ?? []) as unknown as Array<{ user: Record<string, unknown> | null }>)
    .map((r) => r.user)
    .filter(Boolean);

  const { data: season } = await supabase.from('seasons').select('group_id').eq('id', quedada.season_id).maybeSingle();
  let isAdmin = user.role === 'super_admin';
  if (!isAdmin && season) {
    const [{ data: group }, { data: mine }] = await Promise.all([
      supabase.from('groups').select('admin_id').eq('id', season.group_id).maybeSingle(),
      supabase.from('group_members').select('role').eq('group_id', season.group_id).eq('user_id', user.id).maybeSingle(),
    ]);
    isAdmin = group?.admin_id === user.id || (mine as { role?: string } | null)?.role === 'admin';
  }

  return NextResponse.json({ ok: true, quedada, matches: matches ?? [], players: playerRows, isAdmin });
}

// POST /api/quedadas/[id]/finish → finalizar quedada (admin)
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();
  const qid = ctx.params.id;

  const { data: quedada } = await supabase.from('quedadas').select('*').eq('id', qid).maybeSingle();
  if (!quedada) return unauthorized('Quedada no encontrada', 404);

  const { data: season } = await supabase.from('seasons').select('group_id').eq('id', quedada.season_id).maybeSingle();
  let isAdmin = user.role === 'super_admin';
  if (!isAdmin && season) {
    const [{ data: group }, { data: mine }] = await Promise.all([
      supabase.from('groups').select('admin_id').eq('id', season.group_id).maybeSingle(),
      supabase.from('group_members').select('role').eq('group_id', season.group_id).eq('user_id', user.id).maybeSingle(),
    ]);
    isAdmin = group?.admin_id === user.id || (mine as { role?: string } | null)?.role === 'admin';
  }
  if (!isAdmin) return unauthorized('No autorizado', 403);

  const { data: updated, error: uErr } = await supabase
    .from('quedadas')
    .update({ status: 'completed' })
    .eq('id', qid)
    .select('*')
    .single();
  if (uErr) return unauthorized(uErr.message, 500);

  await audit(supabase, { userId: user.id, action: 'finish_quedada', entity: 'quedada', entityId: qid });
  return NextResponse.json({ ok: true, quedada: updated });
}
