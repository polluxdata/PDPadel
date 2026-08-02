import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { audit } from '@/lib/audit';
import { generateMatches } from '@/lib/matchmaking';

// POST /api/groups/[id]/quedadas → crear quedada (jugadores + partidos round-robin)
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();
  const groupId = ctx.params.id;

  const body = (await req.json().catch(() => ({}))) as {
    seasonId?: string;
    name?: string;
    date?: string;
    duration?: number;
    courts?: number;
    mode?: 'points' | 'sets';
    target?: number;
    playerIds?: string[];
  };

  const courts = body.courts ?? 1;
  const playerIds = body.playerIds ?? [];
  const needed = courts * 4;
  if (playerIds.length !== needed) {
    return unauthorized(`Se necesitan exactamente ${needed} jugadores.`, 400);
  }
  if (!body.seasonId) return unauthorized('Falta la temporada', 400);

  const { data: season } = await supabase.from('seasons').select('*').eq('id', body.seasonId).maybeSingle();
  if (!season || season.group_id !== groupId) return unauthorized('Temporada inválida', 400);
  if (season.status !== 'active') return unauthorized('La temporada está cerrada', 400);

  const { data: group } = await supabase.from('groups').select('admin_id').eq('id', groupId).maybeSingle();
  const [{ data: mine }] = await Promise.all([
    supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', user.id).maybeSingle(),
  ]);
  const isOwner = group?.admin_id === user.id;
  const isGroupAdmin = (mine as { role?: string } | null)?.role === 'admin';
  if (user.role !== 'super_admin' && !isOwner && !isGroupAdmin) return unauthorized('No autorizado', 403);

  const { data: quedada, error: qErr } = await supabase
    .from('quedadas')
    .insert({
      season_id: body.seasonId,
      name: body.name?.trim() || null,
      quedada_date: body.date || new Date().toISOString().slice(0, 10),
      duration_minutes: body.duration ?? 120,
      courts,
      mode: body.mode ?? 'points',
      target_score: body.target ?? 31,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (qErr || !quedada) return unauthorized(qErr?.message ?? 'Error', 500);

  await supabase.from('quedada_players').insert(
    playerIds.map((user_id) => ({ quedada_id: quedada.id, user_id }))
  );

  const generated = generateMatches(playerIds, courts);
  const { error: mErr } = await supabase.from('matches').insert(
    generated.map((m) => ({
      quedada_id: quedada.id,
      round_number: m.round,
      court_number: m.court,
      player1_id: m.teamA[0],
      player2_id: m.teamA[1],
      player3_id: m.teamB[0],
      player4_id: m.teamB[1],
      status: 'pending',
      created_by: user.id,
    }))
  );
  if (mErr) return unauthorized('Se creó la quedada pero fallaron los partidos: ' + mErr.message, 500);

  await audit(supabase, { userId: user.id, action: 'create_quedada', entity: 'quedada', entityId: quedada.id, details: { courts, mode: body.mode ?? 'points', players: playerIds.length } });
  return NextResponse.json({ ok: true, quedada });
}
