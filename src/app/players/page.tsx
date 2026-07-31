'use client';

import { useEffect, useState } from 'react';
import AppHeader, { BottomNav } from '@/components/AppHeader';
import StandingsTable from '@/components/StandingsTable';
import { createClient } from '@/lib/supabase/client';
import { computeRankings } from '@/lib/rankings';
import type { MatchWithPlayers, Player } from '@/lib/types';

export default function PlayersPage() {
  const supabase = createClient();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: pl }, { data: mt }] = await Promise.all([
        supabase.from('players').select('*').order('name'),
        supabase
          .from('matches')
          .select('*, p1:players!player1_id(*), p2:players!player2_id(*), p3:players!player3_id(*), p4:players!player4_id(*)')
          .eq('status', 'completed'),
      ]);
      if (pl) setPlayers(pl as Player[]);
      if (mt) setMatches(mt as MatchWithPlayers[]);
      setLoading(false);
    })();
  }, [supabase]);

  const rows = computeRankings(players, matches);

  return (
    <div className="pb-20">
      <AppHeader title="Jugadores" subtitle="Historial general" />
      <main className="mx-auto max-w-lg px-4 py-5">
        <p className="mb-3 text-sm text-slate-400">
          {players.length} jugador{players.length === 1 ? '' : 'es'} registrados
        </p>
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
        ) : (
          <StandingsTable rows={rows} />
        )}
      </main>
      <BottomNav active="players" />
    </div>
  );
}
