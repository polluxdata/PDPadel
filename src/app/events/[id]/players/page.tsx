'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import PlayerAutocomplete from '@/components/PlayerAutocomplete';
import { createClient } from '@/lib/supabase/client';
import { generateMatches } from '@/lib/matchmaking';
import { PLAYERS_PER_COURT } from '@/lib/constants';
import type { Event } from '@/lib/types';

interface Entry {
  id: string | null;
  name: string;
}

export default function EventPlayersPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [event, setEvent] = useState<Event | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savedExisting, setSavedExisting] = useState<Set<string>>(new Set());

  const total = event ? event.courts * PLAYERS_PER_COURT : 0;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .single();
      if (!error && data) {
        setEvent(data as Event);
        const count = (data as Event).courts * PLAYERS_PER_COURT;
        setEntries(Array.from({ length: count }, () => ({ id: null, name: '' })));
      }
      setLoading(false);
    })();
  }, [supabase, params.id]);

  function setEntry(i: number, value: Entry) {
    setEntries((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  const filled = entries.filter((e) => e.name.trim().length > 0).length;

  async function generate() {
    if (filled < total) {
      alert(`Faltan ${total - filled} jugador(es) por registrar.`);
      return;
    }

    setGenerating(true);
    try {
      const playerIds: string[] = [];

      for (const entry of entries) {
        const name = entry.name.trim();
        let id = entry.id;

        if (!id) {
          const { data } = await supabase
            .from('players')
            .select('id')
            .eq('name', name)
            .maybeSingle();
          if (data) {
            id = data.id;
          } else {
            const inserted = await supabase
              .from('players')
              .insert({ name })
              .select('id')
              .single();
            if (inserted.error) throw inserted.error;
            id = inserted.data.id;
          }
        }
        if (!id) throw new Error('No se pudo crear el jugador ' + name);
        playerIds.push(id);
      }

      const rows = playerIds.map((player_id) => ({
        event_id: params.id,
        player_id,
      }));
      await supabase.from('event_players').upsert(rows, { onConflict: 'event_id,player_id' });

      const generated = generateMatches(playerIds, event!.courts);
      const matchRows = generated.map((m) => ({
        event_id: params.id,
        round_number: m.round,
        court_number: m.court,
        player1_id: m.teamA[0],
        player2_id: m.teamA[1],
        player3_id: m.teamB[0],
        player4_id: m.teamB[1],
        mode: 'points',
        target_score: 31,
        max_sets: 3,
        score_team1: 0,
        score_team2: 0,
        status: 'pending',
      }));

      const { error } = await supabase.from('matches').insert(matchRows);
      if (error) throw error;

      router.push(`/events/${params.id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al generar los partidos.');
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div>
        <AppHeader title="Registrar jugadores" backHref={`/events/${params.id}`} />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <AppHeader
        title="Registrar jugadores"
        subtitle={event?.name || 'Jornada'}
        backHref={`/events/${params.id}`}
      />

      <main className="mx-auto max-w-lg px-4 py-5">
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <span className="text-slate-600">1 Configurar</span>
          <span className="text-slate-600">→</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 font-bold text-slate-950">
            2
          </span>
          Registro
          <span className="text-slate-600">→</span>
          <span className="text-slate-600">3 Partidos</span>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-slate-300">
            <Users size={16} className="text-emerald-400" />
            Jugadores
          </span>
          <span className="font-mono text-sm font-bold text-emerald-400">
            {filled}/{total}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {entries.map((entry, i) => (
            <PlayerAutocomplete
              key={i}
              label={`Jugador ${i + 1}`}
              selected={savedExisting.has(entry.name.trim().toLowerCase())}
              onSelect={(v) => {
                if (v.id) {
                  setSavedExisting((prev) => {
                    const next = new Set(prev);
                    next.add(v.name.toLowerCase());
                    return next;
                  });
                }
                setEntry(i, v);
              }}
            />
          ))}
        </div>

        <button
          onClick={generate}
          disabled={generating || filled < total}
          className="btn-primary mt-6 w-full"
        >
          {generating && <Loader2 size={16} className="animate-spin" />}
          Generar partidos
        </button>
        {filled < total && (
          <p className="mt-2 text-center text-xs text-slate-500">
            Registra los {total} jugadores para generar los partidos.
          </p>
        )}
      </main>
    </div>
  );
}
