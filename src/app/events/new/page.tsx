'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import {
  DEFAULT_DURATION,
  MAX_COURTS,
  MIN_COURTS,
  PLAYERS_PER_COURT,
} from '@/lib/constants';
import type { Season } from '@/lib/types';

export default function NewEventPage() {
  const router = useRouter();
  const supabase = createClient();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [name, setName] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [courts, setCourts] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('seasons').select('*').order('name');
      if (data) {
        setSeasons(data as Season[]);
        const current = data.find((s: Season) => s.is_current);
        setSeasonId(current?.id ?? data[0]?.id ?? '');
      }
    })();
  }, [supabase]);

  const totalPlayers = courts * PLAYERS_PER_COURT;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .insert({
        name: name.trim() || null,
        season_id: seasonId || null,
        event_date: date || null,
        duration_minutes: duration,
        courts,
        status: 'active',
      })
      .select()
      .single();
    setLoading(false);
    if (error) {
      alert('No se pudo crear la jornada: ' + error.message);
      return;
    }
    router.push(`/events/${data.id}/players`);
  }

  return (
    <div>
      <AppHeader title="Nueva jornada" backHref="/" />

      <main className="mx-auto max-w-lg px-4 py-5">
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 font-bold text-slate-950">
            1
          </span>
          Configurar
          <span className="text-slate-600">→</span>
          <span className="text-slate-600">2 Registro</span>
          <span className="text-slate-600">→</span>
          <span className="text-slate-600">3 Partidos</span>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="card flex flex-col gap-4">
            <div>
              <label className="label">Nombre de la jornada</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Jornada 3"
              />
            </div>

            <div>
              <label className="label">Temporada</label>
              <select
                className="input"
                value={seasonId}
                onChange={(e) => setSeasonId(e.target.value)}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Fecha</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Duración (minutos)</label>
              <input
                type="number"
                min={30}
                step={15}
                className="input"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="label">
                Canchas ({MIN_COURTS}–{MAX_COURTS})
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCourts(n)}
                    className={
                      'flex-1 rounded-xl border py-3 text-center font-semibold transition ' +
                      (courts === n
                        ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600')
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card flex items-center gap-3 border-emerald-800 bg-emerald-950/30">
            <Users size={22} className="text-emerald-400" />
            <div>
              <p className="text-sm text-slate-300">
                Total de jugadores:{' '}
                <span className="text-lg font-extrabold text-emerald-400">
                  {totalPlayers}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                {courts} × {PLAYERS_PER_COURT} = {totalPlayers} jugadores
              </p>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Siguiente: Registrar jugadores
          </button>
        </form>
      </main>
    </div>
  );
}
