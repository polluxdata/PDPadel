'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Flag, Loader2, UserPlus } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import MatchCard from '@/components/MatchCard';
import StandingsTable from '@/components/StandingsTable';
import { createClient } from '@/lib/supabase/client';
import { computeRankings } from '@/lib/rankings';
import { formatDate } from '@/lib/utils';
import type { Event, MatchWithPlayers, Player } from '@/lib/types';

export default function EventDashboard() {
  const params = useParams<{ id: string }>();
  const supabase = useRef(createClient()).current;
  const [event, setEvent] = useState<Event | null>(null);
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [skipping, setSkipping] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const load = useCallback(async () => {
    const [{ data: ev }, { data: mt }, { data: pl }] = await Promise.all([
      supabase.from('events').select('*').eq('id', params.id).single(),
      supabase
        .from('matches')
        .select('*, p1:players!player1_id(*), p2:players!player2_id(*), p3:players!player3_id(*), p4:players!player4_id(*)')
        .eq('event_id', params.id)
        .order('round_number')
        .order('court_number'),
      supabase
        .from('event_players')
        .select('player:players(*)')
        .eq('event_id', params.id),
    ]);

    if (ev) setEvent(ev as Event);
    if (mt) setMatches(mt as MatchWithPlayers[]);
    if (pl) {
      setPlayers(
        (pl as unknown as Array<{ player: Player | null }>)
          .map((r) => r.player)
          .filter((p): p is Player => !!p)
      );
    }
    setLoading(false);
  }, [supabase, params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function skipMatch(id: string) {
    if (!confirm('¿Saltar este partido? No contará para la clasificación.')) return;
    setSkipping(id);
    await supabase.from('matches').update({ status: 'skipped' }).eq('id', id);
    setSkipping(null);
    await load();
  }

  async function finishEvent() {
    if (!confirm('¿Finalizar la jornada? Se calculará la clasificación final.')) return;
    setFinishing(true);
    await supabase
      .from('events')
      .update({ status: 'completed' })
      .eq('id', params.id);
    await load();
    setFinishing(false);
  }

  const rounds = Array.from(
    new Set(matches.map((m) => m.round_number))
  );
  const totalMatches = matches.length;
  const doneMatches = matches.filter(
    (m) => m.status === 'completed' || m.status === 'skipped'
  ).length;
  const rows = computeRankings(players, matches);

  if (loading || !event) {
    return (
      <div>
        <AppHeader title="Jornada" backHref="/" />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <AppHeader
        title={event.name || 'Jornada'}
        subtitle={`${formatDate(event.event_date)} · ${event.courts} ${event.courts === 1 ? 'cancha' : 'canchas'}`}
        backHref="/"
      />

      <main className="mx-auto max-w-lg px-4 py-5">
        {event.status === 'completed' && (
          <div className="mb-5 rounded-xl border border-amber-700 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
            Jornada finalizada. Estos son los resultados finales.
          </div>
        )}

        {matches.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 py-10 text-center">
            <UserPlus size={28} className="text-slate-500" />
            <p className="text-sm text-slate-300">Aún no hay partidos</p>
            <p className="text-xs text-slate-500">
              Registra los jugadores para generar los partidos automáticamente.
            </p>
            <Link href={`/events/${event.id}/players`} className="btn-primary mt-1">
              Registrar jugadores
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="card text-center">
                <p className="text-2xl font-extrabold text-emerald-400">
                  {doneMatches}/{totalMatches}
                </p>
                <p className="text-xs text-slate-400">Partidos jugados</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-extrabold">{rounds.length}</p>
                <p className="text-xs text-slate-400">Rondas</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {rounds.map((round) => (
                <section key={round}>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                    Ronda {round}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {matches
                      .filter((m) => m.round_number === round)
                      .map((m) => (
                        <MatchCard
                          key={m.id}
                          match={m}
                          onSkip={event.status === 'active' ? skipMatch : undefined}
                          busy={skipping === m.id}
                        />
                      ))}
                  </div>
                </section>
              ))}
            </div>

            {event.status === 'active' && (
              <button
                onClick={finishEvent}
                disabled={finishing}
                className="btn-secondary mt-6 w-full border-amber-700 text-amber-300 hover:bg-amber-950/30"
              >
                {finishing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Flag size={16} />
                )}
                Finalizar jornada
              </button>
            )}

            {event.status === 'completed' && (
              <section className="mt-7">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
                  Clasificación final
                </h2>
                <StandingsTable rows={rows} />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
