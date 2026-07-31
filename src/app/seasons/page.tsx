'use client';

import { useCallback, useEffect, useState } from 'react';
import AppHeader, { BottomNav } from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { Season } from '@/lib/types';

export default function SeasonsPage() {
  const supabase = createClient();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('seasons').select('*').order('created_at');
    if (data) setSeasons(data as Season[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function createSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    await supabase.from('seasons').insert({ name: name.trim() });
    setName('');
    setCreating(false);
    await load();
  }

  async function makeCurrent(id: string) {
    await supabase.from('seasons').update({ is_current: false }).neq('id', id);
    await supabase.from('seasons').update({ is_current: true }).eq('id', id);
    await load();
  }

  return (
    <div className="pb-20">
      <AppHeader title="Temporadas" />
      <main className="mx-auto max-w-lg px-4 py-5">
        <form onSubmit={createSeason} className="mb-5 flex gap-2">
          <input
            className="input flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la temporada"
          />
          <button type="submit" disabled={creating || !name.trim()} className="btn-primary">
            Crear
          </button>
        </form>

        <div className="flex flex-col gap-3">
          {seasons.map((s) => (
            <div key={s.id} className="card flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {s.name}{' '}
                  {s.is_current && (
                    <span className="ml-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      ACTUAL
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDate(s.start_date)} — {formatDate(s.end_date)}
                </p>
              </div>
              {!s.is_current && (
                <button
                  onClick={() => makeCurrent(s.id)}
                  className="btn-secondary !px-3 !py-2 text-xs"
                >
                  Hacer actual
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
      <BottomNav active="seasons" />
    </div>
  );
}
