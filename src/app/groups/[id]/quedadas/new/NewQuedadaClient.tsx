'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { useSession } from '@/lib/session';
import {
  DEFAULT_DURATION,
  DEFAULT_TARGET_SCORE,
  PLAYERS_PER_COURT,
  SCORE_TARGETS,
} from '@/lib/constants';
import { displayName, cn } from '@/lib/utils';
import type { Group, Season, User } from '@/lib/types';

export default function NewQuedadaClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { user } = useSession();
  const [group, setGroup] = useState<Group | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [members, setMembers] = useState<Array<{ user: User; role: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [courts, setCourts] = useState(1);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [mode, setMode] = useState<'points' | 'sets'>('points');
  const [target, setTarget] = useState(DEFAULT_TARGET_SCORE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const needed = courts * PLAYERS_PER_COURT;

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      if (!data.ok) return;
      setGroup(data.group as Group);
      setSeason((data.season ?? null) as Season | null);
      setMembers((data.members ?? []) as Array<{ user: User; role: string }>);
    })();
  }, [groupId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!user || !season) return;
    if (selected.size !== needed) {
      setError(`Selecciona exactamente ${needed} jugadores (${courts} × ${PLAYERS_PER_COURT}).`);
      return;
    }
    setSaving(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/quedadas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: season.id,
          name,
          date,
          duration,
          courts,
          mode,
          target,
          playerIds: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (res.ok && data.quedada) {
        router.push(`/groups/${groupId}/quedadas/${data.quedada.id}`);
      } else {
        setError(data.error || 'No se pudo crear la quedada.');
        setSaving(false);
      }
    } catch {
      setError('Error al crear la quedada.');
      setSaving(false);
    }
  }

  if (!group || !season) {
    return (
      <div>
        <AppHeader title="Nueva quedada" backHref={`/groups/${groupId}`} />
        <p className="py-10 text-center text-sm text-slate-400">
          {season ? 'Cargando…' : 'No hay una temporada activa. Créala primero.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="Nueva quedada" subtitle={season.name} backHref={`/groups/${groupId}`} />

      <main className="mx-auto max-w-lg px-4 py-5">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="card flex flex-col gap-4">
            <div>
              <label className="label">Nombre (opcional)</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Quedada del sábado"
              />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div>
              <label className="label">Canchas</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCourts(n)}
                    className={
                      'flex-1 rounded-xl border py-2.5 text-center font-semibold transition ' +
                      (courts === n
                        ? 'border-orange-500 bg-orange-500 text-slate-950'
                        : 'border-slate-700 bg-slate-800 text-slate-300')
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
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
              <label className="label">Formato</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode('points')}
                  className={'flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ' + (mode === 'points' ? 'border-orange-500 bg-orange-500 text-slate-950' : 'border-slate-700 bg-slate-800 text-slate-300')}>
                  Puntos
                </button>
                <button type="button" onClick={() => setMode('sets')}
                  className={'flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ' + (mode === 'sets' ? 'border-orange-500 bg-orange-500 text-slate-950' : 'border-slate-700 bg-slate-800 text-slate-300')}>
                  Sets
                </button>
              </div>
              {mode === 'points' ? (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Meta</span>
                  <div className="flex gap-1.5">
                    {SCORE_TARGETS.map((t) => (
                      <button key={t} type="button" onClick={() => setTarget(t)}
                        className={'rounded-lg px-3 py-1 text-sm font-bold ' + (target === t ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-300')}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">
                  Un solo set sin fin: gana la pareja con más puntos cuando
                  termine el tiempo de la ronda.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <label className="label !mb-0">Jugadores participantes</label>
              <span
                className={cn(
                  'font-mono text-sm font-bold',
                  selected.size === needed ? 'text-orange-400' : 'text-amber-400'
                )}
              >
                {selected.size}/{needed}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {members.map((m) => {
                const on = selected.has(m.user.id);
                return (
                  <button
                    key={m.user.id}
                    type="button"
                    onClick={() => toggle(m.user.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                      on
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold',
                        on ? 'border-orange-400 bg-orange-500 text-slate-950' : 'border-slate-600 text-transparent'
                      )}
                    >
                      ✓
                    </span>
                    <span className="flex-1 font-medium">{displayName(m.user)}</span>
                    <span className="text-xs text-slate-500">@{m.user.username}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              <Users size={12} className="mr-1 inline" />
              Se necesitan {needed} jugadores ({courts} × {PLAYERS_PER_COURT}).
            </p>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Iniciar quedada
          </button>
        </form>
      </main>
    </div>
  );
}
