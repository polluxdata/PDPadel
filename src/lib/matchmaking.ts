// Matchmaking for Pádel Americano.
//
// Step 1 (partners): "circle method" 1-factorization. With N = courts * 4
// players we generate N - 1 rounds of C = courts matches. Every player
// partners with every other player exactly once.
//
// Step 2 (opponents): within each round the N/2 partnerships are grouped
// into N/4 matches. A greedy search over the possible groupings is used so
// that every player also faces every other player at least once.

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
