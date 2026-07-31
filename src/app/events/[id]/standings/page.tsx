'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import StandingsTable from '@/components/StandingsTable';
import { createClient } from '@/lib/supabase/client';
import { computeRankings } from '@/lib/rankings';
import type { Event, MatchWithPlayers, Player } from '@/lib/types';

export default function EventStandingsPage() {
  const params = useParams<{ id: string }>();
  const supabase = useRef(createClient()).current;
  const [event, setEvent] = useState<Event | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: ev }, { data: ep }, { data: mt }] = await Promise.all([
        supabase.from('events').select('*').eq('id', params.id).single(),
        supabase
          .from('event_players')
          .select('player:players(*)')
          .eq('event_id', params.id),
        supabase
          .from('matches')
          .select('*, p1:players!player1_id(*), p2:players!player2_id(*), p3:players!player3_id(*), p4:players!player4_id(*)')
          .eq('event_id', params.id),
      ]);

      if (ev) setEvent(ev as Event);
      if (ep) {
        setPlayers(
          (ep as unknown as Array<{ player: Player | null }>)
            .map((r) => r.player)
            .filter((p): p is Player => !!p)
        );
      }
      if (mt) setMatches(mt as MatchWithPlayers[]);
      setLoading(false);
    })();
  }, [supabase, params.id]);

  const rows = computeRankings(players, matches);

  return (
    <div>
      <AppHeader
        title="Clasificación"
        subtitle={event?.name || 'Jornada'}
        backHref={`/events/${params.id}`}
      />
      <main className="mx-auto max-w-lg px-4 py-5">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
        ) : (
          <StandingsTable rows={rows} />
        )}
      </main>
    </div>
  );
}
