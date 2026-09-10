import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireUser, unauthorized } from '@/lib/api/auth';
import { audit } from '@/lib/audit';
import { generateMexicanoRound, type MexicanoStanding } from '@/lib/matchmaking';
import { displayName } from '@/lib/utils';
import type { User } from '@/lib/types';

// POST /api/quedadas/[id]/rounds → generar la siguiente ronda (Mexicano).
// Solo disponible cuando la ronda anterior está completa: la clasificación de
// la quedada define parejas (1.º+4.º vs 2.º+3.º, cancha 1 = líderes) y los
// descansos se reparten de forma justa.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser(req);
  if (error) return unauthorized(error.message, error.status);
  const supabase = createServiceClient();
  const qid = (await ctx.params).id;

  const [{ data: quedada }, { data: matches }, { data: playerRows }] = await Promise.all([
    supabase.from('quedadas').select('*').eq('id', qid).maybeSingle(),
    supabase.from('matches').select('*').eq('quedada_id', qid).order('round_number').order('court_number'),
    supabase.from('quedada_players').select('user:users(*)').eq('quedada_id', qid),
  ]);
  if (!quedada) return unauthorized('Quedada no encontrada', 404);
  if (quedada.format !== 'mexicano') {
    return unauthorized('Solo las quedadas Mexicanas generan rondas a demanda.', 400);
  }
  if (quedada.status !== 'active') return unauthorized('La quedada está finalizada.', 400);

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

  const players = ((playerRows ?? []) as unknown as Array<{ user: Record<string, unknown> | null }>)
    .map((r) => r.user as unknown as User)
    .filter(Boolean);
  const allMatches = matches ?? [];
  const lastRound = allMatches.reduce((max, m) => Math.max(max, m.round_number), 0);
  const roundPlayers = (round: number): string[] => {
    const ids = new Set<string>();
    for (const m of allMatches) {
      if (m.round_number !== round) continue;
      for (const pid of [m.player1_id, m.player2_id, m.player3_id, m.player4_id]) {
        if (pid) ids.add(pid);
      }
    }
    return Array.from(ids);
  };

  if (lastRound > 0) {
    const incomplete = allMatches.filter(
      (m) => m.round_number === lastRound && m.status !== 'completed'
    );
    if (incomplete.length > 0) {
      return unauthorized(
        `Faltan resultados en la ronda ${lastRound}: regístralos todos para armar la siguiente.`,
        400
      );
    }
  }

  // Clasificación de la quedada: puntaje acumulado del marcador de cada jugador.
  const totals = new Map<string, number>();
  for (const m of allMatches) {
    if (m.status !== 'completed') continue;
    for (const [pid, score] of [
      [m.player1_id, m.score_team1],
      [m.player2_id, m.score_team1],
      [m.player3_id, m.score_team2],
      [m.player4_id, m.score_team2],
    ] as Array<[string | null, number]>) {
      if (!pid) continue;
      totals.set(pid, (totals.get(pid) ?? 0) + score);
    }
  }
  const nameOf = new Map(players.map((u) => [u.id, displayName(u)]));
  const standings: MexicanoStanding[] = Array.from(totals.entries())
    .map(([userId, score]) => ({ userId, score }))
    .sort((a, b) => b.score - a.score || (nameOf.get(a.userId) ?? '').localeCompare(nameOf.get(b.userId) ?? ''));

  const restedByRound: string[][] = [];
  for (let r = 1; r <= lastRound; r++) {
    const played = new Set(roundPlayers(r));
    restedByRound.push(players.map((p) => p.id).filter((id) => !played.has(id)));
  }

  const nextRound = lastRound + 1;
  const generated = generateMexicanoRound({
    roundNumber: nextRound,
    playerIds: players.map((p) => p.id),
    courts: quedada.courts,
    standings,
    restedByRound,
  });

  const { error: mErr } = await supabase.from('matches').insert(
    generated.matches.map((m) => ({
      quedada_id: qid,
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
  if (mErr) return unauthorized('No se pudo crear la ronda: ' + mErr.message, 500);

  await audit(supabase, {
    userId: user.id,
    action: 'create_round',
    entity: 'quedada',
    entityId: qid,
    details: { round: nextRound, courts: quedada.courts, resting: generated.resting },
  });
  return NextResponse.json({ ok: true, round: nextRound, matches: generated.matches, resting: generated.resting });
}
