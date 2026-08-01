'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Minus, Plus, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/session';
import { audit } from '@/lib/audit';
import { WINNING_SETS } from '@/lib/constants';
import { teamLabel } from '@/lib/utils';
import type { MatchWithUsers, SetDetail, User } from '@/lib/types';

const WIN_BY = 2;

export default function ScoreboardPage() {
  const params = useParams<{ id: string; qid: string; mid: string }>();
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const { user } = useSession();

  const [match, setMatch] = useState<MatchWithUsers | null>(null);
  const [mode, setMode] = useState<'points' | 'sets'>('points');
  const [target, setTarget] = useState(31);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [maxSets, setMaxSets] = useState(3);
  const [sets, setSets] = useState<SetDetail[]>([{ t1: 0, t2: 0 }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: q }] = await Promise.all([
        supabase
          .from('matches')
          .select('*, p1:users!player1_id(*), p2:users!player2_id(*), p3:users!player3_id(*), p4:users!player4_id(*)')
          .eq('id', params.mid)
          .maybeSingle(),
        supabase.from('quedadas').select('*').eq('id', params.qid).maybeSingle(),
      ]);
      const mm = (m ?? null) as MatchWithUsers | null;
      const qd = (q ?? null) as { mode: 'points' | 'sets'; target_score: number; max_sets: number } | null;
      if (mm) {
        setMatch(mm);
        setMode(qd?.mode ?? 'points');
        setTarget(qd?.target_score ?? 31);
        setScore1(mm.score_team1);
        setScore2(mm.score_team2);
        setMaxSets(qd?.max_sets ?? 3);
        setSets(mm.sets_details && mm.sets_details.length > 0 ? mm.sets_details : [{ t1: 0, t2: 0 }]);
      }
      setLoading(false);
    })();
  }, [supabase, params.mid, params.qid]);

  const isDone = match?.status === 'completed' || match?.status === 'skipped';
  const isAdmin = !!user && (user.role === 'super_admin' || user.role === 'admin');

  const setsWon1 = sets.filter((s) => s.t1 > s.t2).length;
  const setsWon2 = sets.filter((s) => s.t2 > s.t1).length;

  const pointsWinner =
    score1 >= target && score1 - score2 >= WIN_BY
      ? 1
      : score2 >= target && score2 - score1 >= WIN_BY
        ? 2
        : null;

  const setsNeeded = WINNING_SETS(maxSets);
  const setsWinner = setsWon1 >= setsNeeded ? 1 : setsWon2 >= setsNeeded ? 2 : null;
  const winner = mode === 'points' ? pointsWinner : setsWinner;

  async function markInProgress() {
    if (!user || !match || match.status !== 'pending') return;
    await supabase.from('matches').update({ status: 'in_progress' }).eq('id', params.mid);
    setMatch({ ...match, status: 'in_progress' });
  }

  function bumpScore(team: 1 | 2, delta: number) {
    markInProgress();
    if (team === 1) setScore1((s) => Math.max(0, s + delta));
    else setScore2((s) => Math.max(0, s + delta));
  }

  function setSet(index: number, field: 't1' | 't2', value: number) {
    markInProgress();
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: Math.max(0, value) } : s))
    );
  }

  function addSet() {
    if (sets.length >= maxSets) return;
    markInProgress();
    setSets((prev) => [...prev, { t1: 0, t2: 0 }]);
  }

  function removeSet(index: number) {
    if (sets.length <= 1) return;
    setSets((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveResult() {
    if (!winner || !user) return;
    setSaving(true);
    const patch = {
      score_team1: mode === 'points' ? score1 : setsWon1,
      score_team2: mode === 'points' ? score2 : setsWon2,
      sets_details: mode === 'sets' ? sets : null,
      winner_team: winner,
      status: 'completed',
    };
    const { error } = await supabase.from('matches').update(patch).eq('id', params.mid);
    if (error) {
      setSaving(false);
      alert('Error al guardar: ' + error.message);
      return;
    }
    await audit(supabase, {
      userId: user.id,
      action: 'complete_match',
      entity: 'match',
      entityId: params.mid,
      details: { ...patch },
    });
    router.push(`/groups/${params.id}/quedadas/${params.qid}`);
    router.refresh();
  }

  if (loading || !match) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-slate-400">Cargando partido…</p>
      </div>
    );
  }

  const teamA = [match.p1, match.p2];
  const teamB = [match.p3, match.p4];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href={`/groups/${params.id}/quedadas/${params.qid}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 text-center text-sm font-semibold">
            Cancha {match.court_number} · Ronda {match.round_number}
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">
        {!isAdmin && !isDone ? (
          <p className="mt-10 text-center text-sm text-slate-400">
            Solo el administrador puede ingresar marcadores.
          </p>
        ) : isDone ? (
          <DoneView match={match} teamA={teamA} teamB={teamB} groupId={params.id} qid={params.qid} />
        ) : (
          <>
            {mode === 'points' ? (
              <PointsView
                teamA={teamA}
                teamB={teamB}
                target={target}
                setTarget={(t) => setTarget(Number(t))}
                score1={score1}
                score2={score2}
                onBump={(team, delta) => bumpScore(team, delta)}
              />
            ) : (
              <SetsView
                teamA={teamA}
                teamB={teamB}
                maxSets={maxSets}
                setMaxSets={setMaxSets}
                sets={sets}
                setsWon1={setsWon1}
                setsWon2={setsWon2}
                setsNeeded={setsNeeded}
                setSet={setSet}
                addSet={addSet}
                removeSet={removeSet}
              />
            )}

            {winner ? (
              <div className="mt-5 rounded-xl border border-emerald-700 bg-emerald-950/30 p-4 text-center">
                <p className="text-sm text-emerald-300">
                  🏆 Ganó{' '}
                  <span className="font-bold text-emerald-200">
                    {winner === 1 ? teamLabel(teamA) : teamLabel(teamB)}
                  </span>
                </p>
                <button onClick={saveResult} disabled={saving} className="btn-primary mt-3 w-full">
                  {saving ? 'Guardando…' : 'Registrar resultado'}
                </button>
              </div>
            ) : (
              <p className="mt-5 text-center text-sm text-slate-500">
                {mode === 'points'
                  ? `Gana el primero en llegar a ${target} con ${WIN_BY} de ventaja`
                  : `Gana quien consiga ${setsNeeded} ${setsNeeded === 1 ? 'set' : 'sets'}`}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TeamScorePanel({
  name,
  score,
  accent,
  onBump,
}: {
  name: string;
  score: number;
  accent: 'A' | 'B';
  onBump: (delta: number) => void;
}) {
  const color = accent === 'A' ? 'border-sky-700 bg-sky-950/30' : 'border-rose-700 bg-rose-950/30';
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="mb-2 line-clamp-2 min-h-10 text-center text-sm font-bold">{name}</p>
      <p className="text-center text-6xl font-black tabular-nums">{score}</p>
      <div className="mt-4 flex justify-center gap-3">
        <button
          onClick={() => onBump(-1)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-200 active:scale-90"
        >
          <Minus size={20} />
        </button>
        <button
          onClick={() => onBump(1)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-slate-950 active:scale-90"
        >
          <Plus size={22} />
        </button>
      </div>
    </div>
  );
}

function PointsView({
  teamA,
  teamB,
  target,
  setTarget,
  score1,
  score2,
  onBump,
}: {
  teamA: Array<User | null | undefined>;
  teamB: Array<User | null | undefined>;
  target: number;
  setTarget: (t: number) => void;
  score1: number;
  score2: number;
  onBump: (team: 1 | 2, delta: number) => void;
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5">
        <span className="text-sm text-slate-400">Meta</span>
        <div className="flex gap-1.5">
          {[21, 31, 50].map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={
                'rounded-lg px-3 py-1 text-sm font-bold transition ' +
                (target === t ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300')
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TeamScorePanel name={teamLabel(teamA)} score={score1} accent="A" onBump={(d) => onBump(1, d)} />
        <TeamScorePanel name={teamLabel(teamB)} score={score2} accent="B" onBump={(d) => onBump(2, d)} />
      </div>
    </>
  );
}

function SetsView({
  teamA,
  teamB,
  maxSets,
  setMaxSets,
  sets,
  setsWon1,
  setsWon2,
  setsNeeded,
  setSet,
  addSet,
  removeSet,
}: {
  teamA: Array<User | null | undefined>;
  teamB: Array<User | null | undefined>;
  maxSets: number;
  setMaxSets: (n: number) => void;
  sets: SetDetail[];
  setsWon1: number;
  setsWon2: number;
  setsNeeded: number;
  setSet: (i: number, field: 't1' | 't2', v: number) => void;
  addSet: () => void;
  removeSet: (i: number) => void;
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5">
        <span className="text-sm text-slate-400">Al mejor de</span>
        <div className="flex gap-1.5">
          {[1, 3, 5].map((n) => (
            <button
              key={n}
              onClick={() => setMaxSets(n)}
              className={
                'rounded-lg px-3 py-1 text-sm font-bold transition ' +
                (maxSets === n ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300')
              }
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-sky-700 bg-sky-950/30 p-4 text-center">
          <p className="mb-2 text-sm font-bold">{teamLabel(teamA)}</p>
          <p className="text-6xl font-black tabular-nums">{setsWon1}</p>
          <p className="mt-2 text-xs text-slate-400">faltan {Math.max(0, setsNeeded - setsWon1)}</p>
        </div>
        <div className="rounded-2xl border border-rose-700 bg-rose-950/30 p-4 text-center">
          <p className="mb-2 text-sm font-bold">{teamLabel(teamB)}</p>
          <p className="text-6xl font-black tabular-nums">{setsWon2}</p>
          <p className="mt-2 text-xs text-slate-400">faltan {Math.max(0, setsNeeded - setsWon2)}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-300">Sets (detalle)</p>
          <button onClick={addSet} disabled={sets.length >= maxSets} className="btn-secondary !px-3 !py-1.5 text-xs">
            <Plus size={14} /> Agregar set
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-14 text-xs font-bold text-slate-500">Set {i + 1}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={s.t1}
                onChange={(e) => setSet(i, 't1', Number(e.target.value))}
                className="input !py-2 text-center"
              />
              <span className="text-slate-500">–</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={s.t2}
                onChange={(e) => setSet(i, 't2', Number(e.target.value))}
                className="input !py-2 text-center"
              />
              <button
                onClick={() => removeSet(i)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-400 hover:bg-slate-800"
                aria-label={`Eliminar set ${i + 1}`}
              >
                <Minus size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function DoneView({
  match,
  teamA,
  teamB,
  groupId,
  qid,
}: {
  match: MatchWithUsers;
  teamA: Array<User | null | undefined>;
  teamB: Array<User | null | undefined>;
  groupId: string;
  qid: string;
}) {
  const winnerName =
    match.winner_team === 1 ? teamLabel(teamA) : match.winner_team === 2 ? teamLabel(teamB) : null;

  return (
    <div className="card flex flex-col items-center gap-4 py-10 text-center">
      {match.status === 'completed' && winnerName ? (
        <>
          <Trophy size={40} className="text-amber-400" />
          <p className="text-2xl font-extrabold">¡{winnerName}!</p>
          <p className="text-sm text-slate-400">
            {match.sets_details
              ? `Sets ${match.sets_details.map((s) => `${s.t1}-${s.t2}`).join(', ')}`
              : `${match.score_team1} – ${match.score_team2}`}
          </p>
          <Link href={`/groups/${groupId}/quedadas/${qid}`} className="btn-primary mt-2 w-full">
            <Check size={16} /> Volver a la quedada
          </Link>
        </>
      ) : (
        <>
          <p className="text-xl font-bold">Partido saltado</p>
          <Link href={`/groups/${groupId}/quedadas/${qid}`} className="btn-secondary w-full">
            Volver a la quedada
          </Link>
        </>
      )}
    </div>
  );
}
