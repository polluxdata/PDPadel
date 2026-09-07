// Matchmaking for Pádel Americano.
//
// Step 1 (partners): "circle method" 1-factorization. With N = courts * 4
// players we generate N - 1 rounds of C = courts matches. Every player
// partners with every other player exactly once.
//
// Step 2 (opponents): within each round the N/2 partnerships are grouped
// into N/4 matches. A greedy search over the possible groupings is used so
// that every player also faces every other player at least once.
//
// Mexicano: la primera ronda se sortea al azar; cada ronda siguiente se arma
// desde la clasificación de la quedada (puntaje acumulado por jugador).
// Los jugadores se agrupan en bloques de 4 por posición y dentro de cada
// bloque juegan 1.º + 4.º contra 2.º + 3.º. La cancha 1 son los líderes.
// Si sobran jugadores (no múltiplo de 4) descansan con rotación justa:
// descansan los que menos descansos acumulan y quien descansó la ronda
// anterior vuelve directo a la pista; el descanso nunca lo decide la tabla.

export interface GeneratedMatch {
  round: number;
  court: number;
  teamA: [string, string];
  teamB: [string, string];
}

// All perfect matchings of nodes 0..h-1 (used to group partnerships
// into matches). h is at most 10 (20 players), so 945 matchings max.
function allMatchings(h: number): Array<Array<[number, number]>> {
  const result: Array<Array<[number, number]>> = [];
  const nodes = Array.from({ length: h }, (_, i) => i);

  function rec(list: number[], acc: Array<[number, number]>) {
    if (list.length === 0) {
      result.push(acc.map((p) => [...p] as [number, number]));
      return;
    }
    const a = list[0];
    for (let i = 1; i < list.length; i++) {
      const b = list[i];
      const rest = list.filter((_, j) => j !== 0 && j !== i);
      acc.push([a, b]);
      rec(rest, acc);
      acc.pop();
    }
  }

  rec(nodes, []);
  return result;
}

export function generateMatches(
  playerIds: string[],
  courts: number
): GeneratedMatch[] {
  const n = playerIds.length;
  if (n % 4 !== 0 || courts * 4 !== n) {
    throw new Error(`Se necesitan ${courts * 4} jugadores para ${courts} canchas.`);
  }

  const h = n / 2;
  const matchings = allMatchings(h);

  // 1. Partner schedule via the circle method.
  const arr = [...playerIds];
  const roundsPairs: Array<Array<[string, string]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < h; i++) {
      pairs.push([arr[i], arr[n - 1 - i]]);
    }
    roundsPairs.push(pairs);

    const last = arr[n - 1];
    for (let i = n - 1; i > 1; i--) arr[i] = arr[i - 1];
    arr[1] = last;
  }

  // 2. Greedy grouping so opponents are covered as much as possible.
  const index = new Map<string, number>(playerIds.map((id, i) => [id, i]));
  const faced: Array<Set<string>> = playerIds.map(() => new Set());

  const matches: GeneratedMatch[] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = roundsPairs[r];
    let best: Array<[number, number]> | null = null;
    let bestScore = -1;

    for (const m of matchings) {
      let score = 0;
      for (const [i, j] of m) {
        for (const p of pairs[i]) {
          const fp = faced[index.get(p)!];
          for (const q of pairs[j]) {
            if (!fp.has(q)) score++;
            if (!faced[index.get(q)!].has(p)) score++;
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }

    if (!best) throw new Error('No se pudo generar el calendario.');

    best.forEach(([i, j], k) => {
      matches.push({
        round: r + 1,
        court: k + 1,
        teamA: [pairs[i][0], pairs[i][1]],
        teamB: [pairs[j][0], pairs[j][1]],
      });
    });

    for (const [i, j] of best) {
      for (const p of pairs[i]) {
        const fp = faced[index.get(p)!];
        for (const q of pairs[j]) {
          fp.add(q);
          faced[index.get(q)!].add(p);
        }
      }
    }
  }

  return matches;
}

// ─── Mexicano ────────────────────────────────────────────────────────────

export interface MexicanoStanding {
  userId: string;
  score: number;
}

export interface MexicanoRound {
  matches: GeneratedMatch[];
  resting: string[];
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildMexicanoMatches(
  playing: string[],
  roundNumber: number,
  courts: number
): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];
  for (let c = 0; c < courts; c++) {
    const g = playing.slice(c * 4, c * 4 + 4);
    if (g.length < 4) break;
    matches.push({
      round: roundNumber,
      court: c + 1,
      teamA: [g[0], g[3]],
      teamB: [g[1], g[2]],
    });
  }
  return matches;
}

function selectPlaying(
  playerIds: string[],
  courts: number,
  standings: MexicanoStanding[],
  restedByRound: string[][]
): { playing: string[]; resting: string[] } {
  const slots = courts * 4;

  // Sin clasificación todavía (ronda 1): orden base al azar.
  const random =
    standings.length === 0 && restedByRound.length === 0
      ? shuffled(playerIds)
      : playerIds;
  const positionOf = new Map(standings.map((s, i) => [s.userId, i]));
  const scoreOf = new Map(standings.map((s) => [s.userId, s.score]));

  const sorted = [...random].sort((a, b) => {
    const sa = scoreOf.get(a) ?? 0;
    const sb = scoreOf.get(b) ?? 0;
    if (sa !== sb) return sb - sa;
    return (positionOf.get(a) ?? random.length) - (positionOf.get(b) ?? random.length);
  });

  if (random.length <= slots) return { playing: sorted, resting: [] };

  const restsCount = new Map<string, number>();
  for (const id of random) restsCount.set(id, 0);
  for (const round of restedByRound) {
    for (const id of round) restsCount.set(id, (restsCount.get(id) ?? 0) + 1);
  }
  const prevRested = new Set(restedByRound[restedByRound.length - 1] ?? []);

  const resting = [...sorted]
    .sort(
      (a, b) =>
        (restsCount.get(a) ?? 0) - (restsCount.get(b) ?? 0) ||
        (prevRested.has(a) ? 1 : 0) - (prevRested.has(b) ? 1 : 0) ||
        a.localeCompare(b)
    )
    .slice(0, random.length - slots);
  const restingSet = new Set(resting);
  return { playing: sorted.filter((id) => !restingSet.has(id)), resting };
}

export function generateMexicanoRound(opts: {
  roundNumber: number;
  playerIds: string[];
  courts: number;
  // Clasificación de la quedada ordenada (puntaje desc; desempate del caller).
  standings?: MexicanoStanding[];
  // Jugadores que descansaron en cada ronda ya jugada (índice r-1 = ronda r).
  restedByRound?: string[][];
}): MexicanoRound {
  const { roundNumber, playerIds, courts } = opts;
  if (courts < 1) throw new Error('Se necesita al menos una cancha.');
  if (playerIds.length < 4) throw new Error('Se necesitan al menos 4 jugadores.');
  if (playerIds.length < courts * 4) {
    throw new Error(`Se necesitan al menos ${courts * 4} jugadores para ${courts} canchas.`);
  }
  const { playing, resting } = selectPlaying(
    playerIds,
    courts,
    opts.standings ?? [],
    opts.restedByRound ?? []
  );
  return { matches: buildMexicanoMatches(playing, roundNumber, courts), resting };
}
