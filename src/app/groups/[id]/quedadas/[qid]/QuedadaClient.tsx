'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Flag, Loader2, Users } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import MatchCard from '@/components/MatchCard';
import { useSession } from '@/lib/session';
import { displayName, formatDate } from '@/lib/utils';
import { MODE_LABELS } from '@/lib/constants';
import type { MatchWithUsers, Quedada, User } from '@/lib/types';

export default function QuedadaClient({
  groupId,
  quedadaId,
}: {
  groupId: string;
  quedadaId: string;
}) {
  const { user } = useSession();
  const [quedada, setQuedada] = useState<Quedada | null>(null);
  const [matches, setMatches] = useState<MatchWithUsers[]>([]);
  const [players, setPlayers] = useState<User[]>([]);
  const [isAdminHere, setIsAdminHere] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [activeRound, setActiveRound] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/quedadas/${quedadaId}`);
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'No se pudo cargar la quedada.');
        return;
      }
      setQuedada(data.quedada as Quedada);
      setMatches((data.matches ?? []) as MatchWithUsers[]);
      setPlayers((data.players ?? []) as User[]);
      setIsAdminHere(Boolean(data.isAdmin));
    } catch (err) {
      console.error('Error cargando quedada', err);
      setError('No se pudo cargar la quedada.');
    } finally {
      setLoading(false);
    }
  }, [quedadaId]);

  useEffect(() => {
    load();
  }, [load]);

  async function finishQuedada() {
    if (!quedada || !user) return;
    const pending = matches.filter((m) => m.status === 'pending' || m.status === 'in_progress');
    if (pending.length > 0) {
      if (!confirm(`${pending.length} partido(s) sin jugar. ¿Finalizar igualmente?`)) return;
    }
    if (!confirm('¿Finalizar la quedada? Los puntos se suman al ranking de la temporada.')) return;
    setFinishing(true);
    const res = await fetch(`/api/quedadas/${quedada.id}/finish`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'No se pudo finalizar.');
    await load();
    setFinishing(false);
  }

  const rounds = Array.from(new Set(matches.map((m) => m.round_number)));
  const total = matches.length;
  const done = matches.filter((m) => m.status === 'completed' || m.status === 'skipped').length;

  // Solo al cargar por primera vez, ir a la primera ronda con juego pendiente.
  // (Después el usuario navega libremente, incluyendo rondas ya jugadas.)
  const initialized = useRef(false);
  useEffect(() => {
    if (matches.length === 0 || initialized.current) return;
    initialized.current = true;
    const pending = matches.filter(
      (m) => m.status === 'pending' || m.status === 'in_progress'
    );
    const next =
      pending.length > 0 ? Math.min(...pending.map((m) => m.round_number)) : rounds[0];
    setActiveRound(next);
  }, [matches, rounds]);

  const roundMatches = matches.filter((m) => m.round_number === activeRound);
  const roundDone = roundMatches.filter(
    (m) => m.status === 'completed' || m.status === 'skipped'
  ).length;
  const hasPrev = rounds.indexOf(activeRound) > 0;
  const hasNext = rounds.indexOf(activeRound) < rounds.length - 1;

  function goToRound(round: number) {
    setActiveRound(round);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goPrev() {
    const i = rounds.indexOf(activeRound);
    if (i > 0) goToRound(rounds[i - 1]);
  }

  function goNext() {
    const i = rounds.indexOf(activeRound);
    if (i < rounds.length - 1) goToRound(rounds[i + 1]);
  }

  if (error) {
    return (
      <div>
        <AppHeader title="Quedada" backHref={`/groups/${groupId}`} />
        <main className="mx-auto max-w-lg px-4 py-10 text-center">
          <p className="mb-4 text-sm text-rose-400">{error}</p>
          <button onClick={load} className="btn-secondary">
            Reintentar
          </button>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <AppHeader title="Quedada" backHref={`/groups/${groupId}`} />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  if (!quedada) {
    return (
      <div>
        <AppHeader title="Quedada" backHref={`/groups/${groupId}`} />
        <main className="mx-auto max-w-lg px-4 py-10 text-center">
          <p className="mb-4 text-sm text-slate-400">Quedada no encontrada.</p>
          <Link href={`/groups/${groupId}`} className="btn-secondary">
            Volver al grupo
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <AppHeader
        title={quedada.name || 'Quedada'}
        subtitle={`${formatDate(quedada.quedada_date)} · ${quedada.courts} ${quedada.courts === 1 ? 'cancha' : 'canchas'} · ${MODE_LABELS[quedada.mode]}`}
        backHref={`/groups/${groupId}`}
      />

      <main className="mx-auto max-w-lg px-4 py-5">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5">
          <span className="flex items-center gap-2 text-xs text-slate-400">
            <Users size={14} className="text-orange-400" />
            {players.map(displayName).join(', ')}
          </span>
        </div>

        {quedada.status === 'completed' && (
          <div className="mb-4 rounded-xl border border-amber-700 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
            Quedada finalizada. Los puntos ya cuentan en el ranking de la temporada.
          </div>
        )}

        {matches.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Sin partidos generados.</p>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="card text-center">
                <p className="text-2xl font-extrabold text-orange-400">{done}/{total}</p>
                <p className="text-xs text-slate-400">Partidos jugados</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-extrabold">{rounds.length}</p>
                <p className="text-xs text-slate-400">Rondas</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Navegación de rondas */}
              <div className="card !p-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={goPrev}
                    disabled={!hasPrev}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-lg font-bold text-slate-200 disabled:opacity-30"
                    aria-label="Ronda anterior"
                  >
                    ‹
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-sm font-bold">
                      Ronda {activeRound} de {rounds.length}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {roundDone}/{roundMatches.length} jugados
                    </p>
                  </div>
                  <button
                    onClick={goNext}
                    disabled={!hasNext}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-lg font-bold text-slate-200 disabled:opacity-30"
                    aria-label="Siguiente ronda"
                  >
                    ›
                  </button>
                </div>
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                  {rounds.map((round) => {
                    const ms = matches.filter((m) => m.round_number === round);
                    const allDone = ms.every(
                      (m) => m.status === 'completed' || m.status === 'skipped'
                    );
                    return (
                      <button
                        key={round}
                        onClick={() => goToRound(round)}
                        className={
                          'flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold transition ' +
                          (round === activeRound
                            ? 'bg-orange-500 text-slate-950'
                            : allDone
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-slate-800 text-slate-400')
                        }
                      >
                        {round}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {roundMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    mode={quedada.mode}
                    targetScore={quedada.target_score}
                    admin={isAdminHere}
                    onChanged={load}
                  />
                ))}
              </div>

              {hasNext && (
                <button onClick={goNext} className="btn-secondary w-full">
                  Siguiente ronda ›
                </button>
              )}
            </div>

            {quedada.status === 'active' && isAdminHere && (
              <button
                onClick={finishQuedada}
                disabled={finishing}
                className="btn-secondary mt-6 w-full border-amber-700 text-amber-300 hover:bg-amber-950/30"
              >
                {finishing ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
                Finalizar quedada
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
