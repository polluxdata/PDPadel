'use client';

import MatchScorer from '@/components/MatchScorer';
import type { MatchWithUsers } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/constants';
import { teamLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function MatchCard({
  match,
  mode,
  targetScore,
  admin,
  onChanged,
}: {
  match: MatchWithUsers;
  mode: 'points' | 'sets';
  targetScore: number;
  admin?: boolean;
  onChanged?: () => void;
}) {
  const teamA = [match.p1, match.p2];
  const teamB = [match.p3, match.p4];
  const done = match.status === 'completed' || match.status === 'skipped';

  return (
    <div
      className={cn(
        'card flex flex-col gap-3 !p-3',
        match.status === 'completed' && 'border-orange-800 bg-orange-950/20',
        match.status === 'skipped' && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <span className="rounded-md bg-slate-800 px-2 py-1 font-semibold text-slate-300">
            R{match.round_number}
          </span>
          <span>Cancha {match.court_number}</span>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
            match.status === 'completed' && 'bg-orange-500/20 text-orange-300',
            match.status === 'in_progress' && 'bg-amber-500/20 text-amber-300',
            match.status === 'skipped' && 'bg-slate-700 text-slate-400',
            match.status === 'pending' && 'bg-slate-700 text-slate-300'
          )}
        >
          {STATUS_LABELS[match.status]}
        </span>
      </div>

      {admin && match.status !== 'skipped' ? (
        <MatchScorer
          match={match}
          mode={mode}
          target={targetScore}
          editing={done}
          onSaved={() => onChanged?.()}
        />
      ) : (
        <>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
              <span className="font-semibold">{teamLabel(teamA)}</span>
              {match.status === 'completed' && (
                <span className="font-mono text-orange-400">{match.score_team1}</span>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
              <span className="font-semibold">{teamLabel(teamB)}</span>
              {match.status === 'completed' && (
                <span className="font-mono text-orange-400">{match.score_team2}</span>
              )}
            </div>
          </div>
          {match.status === 'completed' && (
            <p className="text-xs font-semibold text-orange-400">
              Ganó {match.winner_team === 1 ? teamLabel(teamA) : teamLabel(teamB)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
