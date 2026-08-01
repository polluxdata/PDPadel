import { SETS_WIN_POINTS, WIN_POINTS } from './constants';
import { displayName } from './utils';
import type { MatchWithUsers, User } from './types';

export interface SeasonRankingRow {
  userId: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
  setsFor: number;
  setsAgainst: number;
}

export function computeSeasonRanking(
  users: User[],
  matches: MatchWithUsers[]
): SeasonRankingRow[] {
  const map = new Map<string, SeasonRankingRow>();

  for (const u of users) {
    map.set(u.id, {
      userId: u.id,
      name: displayName(u),
      played: 0,
      wins: 0,
      losses: 0,
      points: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      setsFor: 0,
      setsAgainst: 0,
    });
  }

  for (const m of matches) {
    if (m.status !== 'completed') continue;
    const t1: Array<string | null> = [m.player1_id, m.player2_id];
    const t2: Array<string | null> = [m.player3_id, m.player4_id];
    if (t1.some((x) => !x) || t2.some((x) => !x)) continue;

    const winner = m.winner_team;
    for (const pid of [...t1, ...t2]) {
      if (!pid) continue;
      const row = map.get(pid);
      if (!row) continue;
      const isT1 = t1.includes(pid);
      const team = isT1 ? 1 : 2;
      const scoreFor = isT1 ? m.score_team1 : m.score_team2;
      const scoreAgainst = isT1 ? m.score_team2 : m.score_team1;

      row.played += 1;
      // El marcador (puntos o set único sin fin) suma a la diferencia.
      row.pointsFor += scoreFor;
      row.pointsAgainst += scoreAgainst;
      // Desempate adicional con el detalle set a set (si lo hubiera).
      if (m.mode === 'sets' && m.sets_details) {
        for (const s of m.sets_details) {
          row.setsFor += isT1 ? s.t1 : s.t2;
          row.setsAgainst += isT1 ? s.t2 : s.t1;
        }
      }
      if (winner === team) {
        row.wins += 1;
        // En modo sets la pareja ganadora anota 1 punto (los sets quedan
        // guardados para desempate); en modo puntos anota 2.
        row.points += (m.mode ?? 'points') === 'sets' ? SETS_WIN_POINTS : WIN_POINTS;
      } else if (winner) {
        row.losses += 1;
      }
    }
  }

  const rows = Array.from(map.values());
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aDiff = a.pointsFor - a.pointsAgainst;
    const bDiff = b.pointsFor - b.pointsAgainst;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aSet = a.setsFor - a.setsAgainst;
    const bSet = b.setsFor - b.setsAgainst;
    if (bSet !== aSet) return bSet - aSet;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

export function teamOfUser(m: MatchWithUsers, userId: string): 1 | 2 | null {
  if (m.player1_id === userId || m.player2_id === userId) return 1;
  if (m.player3_id === userId || m.player4_id === userId) return 2;
  return null;
}

export function userPlayed(m: MatchWithUsers, userId: string): boolean {
  return (
    m.player1_id === userId ||
    m.player2_id === userId ||
    m.player3_id === userId ||
    m.player4_id === userId
  );
}
