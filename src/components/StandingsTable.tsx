import type { RankingRow } from '@/lib/rankings';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function StandingsTable({ rows }: { rows: RankingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        Sin partidos jugados todavía.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-3 py-3 font-medium">#</th>
            <th className="px-3 py-3 font-medium">Jugador</th>
            <th className="px-2 py-3 text-center font-medium">J</th>
            <th className="px-2 py-3 text-center font-medium">G</th>
            <th className="px-2 py-3 text-center font-medium">P</th>
            <th className="px-3 py-3 text-right font-medium">DF</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const diff =
              (r.pointsFor - r.pointsAgainst) +
              (r.setsFor - r.setsAgainst);
            return (
              <tr
                key={r.playerId}
                className={
                  i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/50'
                }
              >
                <td className="px-3 py-2.5 font-semibold">
                  {MEDALS[i] ?? i + 1}
                </td>
                <td className="max-w-32 truncate px-3 py-2.5 font-medium">
                  {r.name}
                </td>
                <td className="px-2 py-2.5 text-center text-slate-300">
                  {r.played}
                </td>
                <td className="px-2 py-2.5 text-center font-semibold text-emerald-400">
                  {r.wins}
                </td>
                <td className="px-2 py-2.5 text-center text-rose-400">
                  {r.losses}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                  {diff > 0 ? `+${diff}` : diff}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
