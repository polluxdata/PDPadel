import { WIN_POINTS } from './constants';
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
  winPct: number;
  normDiff: number;
}

interface Acc {
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
  fracSum: number;
}

export function computeSeasonRanking(
  users: User[],
  matches: MatchWithUsers[]
): SeasonRankingRow[] {
  const map = new Map<string, Acc>();

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
      fracSum: 0,
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
      row.pointsFor += scoreFor;
      row.pointsAgainst += scoreAgainst;
      if (m.mode === 'sets' && m.sets_details) {
        for (const s of m.sets_details) {
          row.setsFor += isT1 ? s.t1 : s.t2;
          row.setsAgainst += isT1 ? s.t2 : s.t1;
        }
      }
      // Fracción ganada del marcador (comparable entre modo puntos y modo sets).
      const total = scoreFor + scoreAgainst;
      row.fracSum += total > 0 ? scoreFor / total : 0.5;
      // Victoria = 2 pts sin importar el modo de marcador del partido.
      if (winner === team) {
        row.wins += 1;
        row.points += WIN_POINTS;
      } else if (winner) {
        row.losses += 1;
      }
    }
  }

  const rows: SeasonRankingRow[] = Array.from(map.values()).map((r) => ({
    ...r,
    winPct: r.played > 0 ? r.wins / r.played : 0,
    normDiff: r.played > 0 ? r.fracSum / r.played - 0.5 : 0,
  }));

  // 1) Puntos de ranking  2) % de victorias  3) diferencia normalizada
  // 4) head-to-head entre empatados  5) nombre (ver applyHeadToHead).
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    if (Math.abs(b.normDiff - a.normDiff) > 1e-9) return b.normDiff - a.normDiff;
    return a.name.localeCompare(b.name);
  });

  applyHeadToHead(rows, matches);
  return rows;
}

function tieKey(r: SeasonRankingRow): string {
  return `${r.points}|${r.winPct.toFixed(9)}|${r.normDiff.toFixed(9)}`;
}

// Dentro de cada bloque de empatados por (puntos, %V, dif normalizada),
// ordena por victorias en los partidos entre ellos; último criterio: nombre.
function applyHeadToHead(rows: SeasonRankingRow[], matches: MatchWithUsers[]): void {
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && tieKey(rows[j]) === tieKey(rows[i])) j++;
    if (j - i > 1) {
      const group = rows.slice(i, j);
      const h2h = new Map(group.map((r) => [r.userId, 0]));
      const ids = new Set(h2h.keys());
      for (const m of matches) {
        if (m.status !== 'completed' || !m.winner_team) continue;
        const t1 = [m.player1_id, m.player2_id];
        const t2 = [m.player3_id, m.player4_id];
        if (t1.some((x) => !x || !ids.has(x)) || t2.some((x) => !x || !ids.has(x))) continue;
        const winners = m.winner_team === 1 ? t1 : t2;
        for (const pid of winners) {
          if (!pid) continue;
          const cur = h2h.get(pid);
          if (cur !== undefined) h2h.set(pid, cur + 1);
        }
      }
      group.sort(
        (a, b) =>
          (h2h.get(b.userId) ?? 0) - (h2h.get(a.userId) ?? 0) ||
          a.name.localeCompare(b.name)
      );
      rows.splice(i, j - i, ...group);
    }
    i = j;
  }
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
