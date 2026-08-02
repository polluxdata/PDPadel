'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Minus, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/session';
import { audit } from '@/lib/audit';
import { SCORE_TARGETS } from '@/lib/constants';
import { displayName } from '@/lib/utils';
import type { MatchWithUsers, User } from '@/lib/types';

const WIN_BY = 2;

export default function MatchScorer({
  match,
  mode,
  target,
  editing = false,
  onSaved,
}: {
  match: MatchWithUsers;
  mode: 'points' | 'sets';
  target: number;
  editing?: boolean;
  onSaved: () => void;
}) {
  const supabase = useRef(createClient()).current;
  const { user } = useSession();
  const [score1, setScore1] = useState(match.score_team1);
  const [score2, setScore2] = useState(match.score_team2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (match.status === 'pending') {
      supabase.from('matches').update({ status: 'in_progress' }).eq('id', match.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al recargar (tras guardar/editar), sincronizar el marcador con lo guardado.
  useEffect(() => {
    setScore1(match.score_team1);
    setScore2(match.score_team2);
  }, [match.id, match.score_team1, match.score_team2]);

  // Puntos: primero en llegar a la meta con 2 de ventaja.
  const pointsWinner =
    score1 >= target && score1 - score2 >= WIN_BY
      ? 1
      : score2 >= target && score2 - score1 >= WIN_BY
        ? 2
        : null;

  // Set único sin fin: gana el que tenga más al terminar el tiempo.
  const setsWinner = score1 > score2 ? 1 : score2 > score1 ? 2 : null;

  const winner = mode === 'points' ? pointsWinner : setsWinner;
  const teamA = [match.p1, match.p2];
  const teamB = [match.p3, match.p4];

  function bump(team: 1 | 2, delta: number) {
    if (team === 1) setScore1((s) => Math.max(0, s + delta));
    else setScore2((s) => Math.max(0, s + delta));
  }

  async function save() {
    if (!winner || !user) return;
    setSaving(true);
    const patch = {
      score_team1: score1,
      score_team2: score2,
      sets_details: null,
      winner_team: winner,
      status: 'completed',
    };
    const { error } = await supabase.from('matches').update(patch).eq('id', match.id);
    if (error) {
      setSaving(false);
      alert('Error al guardar: ' + error.message);
      return;
    }
    await audit(supabase, {
      userId: user.id,
      action: 'complete_match',
      entity: 'match',
      entityId: match.id,
      details: { ...patch },
    });
    setSaving(false);
    onSaved();
  }

  const showResult = editing && winner;

  return (
    <div className="flex flex-col gap-2">
      {showResult && (
        <p className="flex items-center justify-center gap-2 rounded-xl border border-orange-700 bg-orange-950/30 py-2 text-sm font-bold text-orange-300">
          <CheckCircle2 size={16} /> Ganó{' '}
          {winner === 1 ? teamLabel(teamA) : teamLabel(teamB)}{' '}
          <span className="font-mono">
            {Math.max(score1, score2)}–{Math.min(score1, score2)}
          </span>
        </p>
      )}
      {mode === 'points' && (
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Puntos
          </p>
          <div className="flex gap-1.5">
            {SCORE_TARGETS.map((t) => (
              <span
                key={t}
                className={
                  'rounded px-2 py-0.5 text-[10px] font-bold ' +
                  (t === target ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-600')
                }
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
      {mode === 'sets' && (
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
          Marcador
        </p>
      )}

      <ScoreRow name={teamLabel(teamA)} score={score1} onBump={(d) => bump(1, d)} />
      <ScoreRow name={teamLabel(teamB)} score={score2} onBump={(d) => bump(2, d)} />

      {winner ? (
        <button onClick={save} disabled={saving} className="btn-primary w-full !py-2.5">
          {saving && <Loader2 size={15} className="animate-spin" />}
          {editing
            ? 'Guardar cambios'
            : `Registrar: ${winner === 1 ? teamLabel(teamA) : teamLabel(teamB)} ${Math.max(score1, score2)}–${Math.min(score1, score2)}`}
        </button>
      ) : (
        <p className="py-1 text-center text-xs text-slate-500">
          {mode === 'points'
            ? `Gana el primero en llegar a ${target} con ${WIN_BY} de ventaja`
            : 'Empate: sigan jugando hasta definir'}
        </p>
      )}
    </div>
  );
}

function ScoreRow({
  name,
  score,
  onBump,
}: {
  name: string;
  score: number;
  onBump: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-2 py-1.5">
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</p>
      <button
        onClick={() => onBump(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-slate-200 active:scale-90"
        aria-label="Restar"
      >
        <Minus size={16} />
      </button>
      <p className="w-11 text-center text-2xl font-black tabular-nums">{score}</p>
      <button
        onClick={() => onBump(1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-slate-950 active:scale-90"
        aria-label="Sumar"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

function teamLabel(users: Array<User | null | undefined>): string {
  return users.filter(Boolean).map(displayName).join(' & ') || '???';
}
