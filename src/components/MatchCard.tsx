'use client';

import Link from 'next/link';
import { Play, X, CheckCircle2, Loader2 } from 'lucide-react';
import type { MatchWithUsers } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/constants';
import { teamLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function MatchCard({
  match,
  groupId,
  onSkip,
  busy,
  admin,
}: {
  match: MatchWithUsers;
  groupId: string;
  onSkip?: (id: string) => void;
  busy?: boolean;
  admin?: boolean;
}) {
  const teamA = [match.p1, match.p2];
  const teamB = [match.p3, match.p4];
  const done = match.status === 'completed' || match.status === 'skipped';

  return (
    <div
      className={cn(
        'card flex flex-col gap-3',
        match.status === 'completed' && 'border-emerald-800 bg-emerald-950/20',
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
            match.status === 'completed' && 'bg-emerald-500/20 text-emerald-300',
            match.status === 'in_progress' && 'bg-amber-500/20 text-amber-300',
            match.status === 'skipped' && 'bg-slate-700 text-slate-400',
            match.status === 'pending' && 'bg-slate-700 text-slate-300'
          )}
        >
          {STATUS_LABELS[match.status]}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
          <span className="font-semibold">{teamLabel(teamA)}</span>
          {match.status === 'completed' && (
            <span className="font-mono text-emerald-400">
              {match.score_team1}
              {match.sets_details
                ? ` (${match.sets_details.map((s) => s.t1).join('-')})`
                : ''}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
          <span className="font-semibold">{teamLabel(teamB)}</span>
          {match.status === 'completed' && (
            <span className="font-mono text-emerald-400">
              {match.score_team2}
              {match.sets_details
                ? ` (${match.sets_details.map((s) => s.t2).join('-')})`
                : ''}
            </span>
          )}
        </div>
      </div>

      {!done && admin && (
        <div className="flex gap-2">
          <Link
            href={`/groups/${groupId}/quedadas/${match.quedada_id}/matches/${match.id}`}
            className="btn-primary flex-1"
          >
            <Play size={16} />
            Jugar
          </Link>
          {onSkip && (
            <button
              onClick={() => onSkip(match.id)}
              disabled={busy}
              className="btn-secondary flex-1"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
              Saltar
            </button>
          )}
        </div>
      )}
      {done && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 size={14} />
          {match.status === 'completed'
            ? `Ganó ${match.winner_team === 1 ? teamLabel(teamA) : teamLabel(teamB)}`
            : 'Partido saltado'}
        </div>
      )}
    </div>
  );
}
