import type { Match, MatchWithPlayers, Player } from './types';

export interface RankingRow {
  playerId: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  setsFor: number;
  setsAgainst: number;
  winPct: number;
}

interface TeamSides {
  team1: { id1: string; id2: string };
  team2: { id1: string; id2: string };
}

function teamIds(m: Match): TeamSides | null {
  if (
    !m.player1_id ||
    !m.player2_id ||
    !m.player3_id ||
    !m.player4_id
  ) {
    return null;
  }
  return {
    team1: { id1: m.player1_id, id2: m.player2_id },
    team2: { id1: m.player3_id, id2: m.player4_id },
  };
}

export function playerIsInTeam(m: Match, playerId: string, team: 1 | 2): boolean {
  const sides = teamIds(m);
  if (!sides) return false;
  const t = team === 1 ? sides.team1 : sides.team2;
  return t.id1 === playerId || t.id2 === playerId;
}

export function playerPlayed(m: Match, playerId: string): boolean {
  const sides = teamIds(m);
  if (!sides) return false;
  return (
    sides.team1.id1 === playerId ||
    sides.team1.id2 === playerId ||
    sides.team2.id1 === playerId ||
    sides.team2.id2 === playerId
  );
}

export function computeRankings(
  players: Player[],
  matches: MatchWithPlayers[]
): RankingRow[] {
  const map = new Map<string, RankingRow>();

  for (const p of players) {
    map.set(p.id, {
      playerId: p.id,
      name: p.name,
      played: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      setsFor: 0,
      setsAgainst: 0,
      winPct: 0,
    });
  }

  for (const m of matches) {
    if (m.status !== 'completed') continue;
    const sides = teamIds(m);
    if (!sides) continue;

    const t1: Array<string> = [sides.team1.id1, sides.team1.id2];
    const t2: Array<string> = [sides.team2.id1, sides.team2.id2];
    const winner = m.winner_team;
    const played = m.status === 'completed';

    for (const pid of [...t1, ...t2]) {
      const row = map.get(pid);
      if (!row) continue;
      const team = t1.includes(pid) ? 1 : 2;
      const isTeam1 = team === 1;
      const scoreFor = isTeam1 ? m.score_team1 : m.score_team2;
      const scoreAgainst = isTeam1 ? m.score_team2 : m.score_team1;
      if (played) row.played += 1;
      if (m.mode === 'points') {
        row.pointsFor += scoreFor;
        row.pointsAgainst += scoreAgainst;
      }
      if (m.mode === 'sets' && m.sets_details) {
        for (const s of m.sets_details) {
          const f = isTeam1 ? s.t1 : s.t2;
          const a = isTeam1 ? s.t2 : s.t1;
          row.setsFor += f;
          row.setsAgainst += a;
        }
      }
      if (winner === team) row.wins += 1;
      else if (winner) row.losses += 1;
    }
  }

  const rows = Array.from(map.values());
  for (const r of rows) {
    r.winPct = r.played > 0 ? r.wins / r.played : 0;
  }

  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const aDiff = a.pointsFor - a.pointsAgainst;
    const bDiff = b.pointsFor - b.pointsAgainst;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aSetDiff = a.setsFor - a.setsAgainst;
    const bSetDiff = b.setsFor - b.setsAgainst;
    if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

export function getTeamOfPlayer(m: Match, playerId: string): 1 | 2 | null {
  return playerIsInTeam(m, playerId, 1)
    ? 1
    : playerIsInTeam(m, playerId, 2)
      ? 2
      : null;
}
