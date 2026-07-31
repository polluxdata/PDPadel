'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronRight, Trophy, Calendar } from 'lucide-react';
import AppHeader, { BottomNav } from '@/components/AppHeader';
import StandingsTable from '@/components/StandingsTable';
import { createClient } from '@/lib/supabase/client';
import { computeRankings } from '@/lib/rankings';
import { formatDate } from '@/lib/utils';
import type { Event, MatchWithPlayers, Player, Season } from '@/lib/types';

export default function HomePage() {
  const supabase = createClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [season, setSeason] = useState<Season | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: seasons } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_current', true)
        .limit(1);

      const s = (seasons && seasons[0]) || null;
      setSeason(s);

      const [{ data: ev }, { data: pl }, { data: mt }] = await Promise.all([
        supabase.from('events').select('*').order('event_date', { ascending: false }),
        supabase.from('players').select('*').order('name'),
        supabase
          .from('matches')
          .select('*, p1:players!player1_id(*), p2:players!player2_id(*), p3:players!player3_id(*), p4:players!player4_id(*)')
          .eq('status', 'completed'),
      ]);

      if (ev) setEvents(ev as Event[]);
      if (pl) setPlayers(pl as Player[]);
      if (mt) setMatches(mt as MatchWithPlayers[]);
      setLoading(false);
    })();
  }, [supabase]);

  const active = events.filter((e) => e.status === 'active');
  const completed = events.filter((e) => e.status === 'completed');
  const rows = computeRankings(players, matches);

  return (
    <div className="pb-20">
      <AppHeader title="PDPadel" subtitle={season?.name} action={{ label: 'Nueva', href: '/events/new' }} />

      <main className="mx-auto max-w-lg px-4 py-5">
        {loading && (
          <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
        )}

        {!loading && active.length > 0 && (
          <section className="mb-7">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
              Jornadas en curso
            </h2>
            <div className="flex flex-col gap-3">
              {active.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}

        {!loading && active.length === 0 && (
          <section className="card mb-7 flex flex-col items-center gap-2 py-8 text-center">
            <Plus size={28} className="text-slate-500" />
            <p className="text-sm text-slate-300">No hay jornadas activas</p>
            <p className="text-xs text-slate-500">
              Crea una nueva jornada y genera los partidos.
            </p>
            <Link href="/events/new" className="btn-primary mt-2">
              Crear jornada
            </Link>
          </section>
        )}

        <section className="mb-7">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            <Trophy size={15} className="text-amber-400" />
            Clasificación {season?.name ?? ''}
          </h2>
          <StandingsTable rows={rows} />
        </section>

        {completed.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
              Jornadas finalizadas
            </h2>
            <div className="flex flex-col gap-3">
              {completed.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav active="home" />
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="card flex items-center justify-between gap-3 hover:border-slate-700"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {event.name || 'Jornada'}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
          <Calendar size={12} />
          {formatDate(event.event_date)} · {event.courts}{' '}
          {event.courts === 1 ? 'cancha' : 'canchas'}
        </p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-slate-500" />
    </Link>
  );
}
