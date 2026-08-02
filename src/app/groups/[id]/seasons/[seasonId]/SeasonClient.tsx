'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Flag, Loader2, Plus, Trophy, ChevronRight, Calendar } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import StandingsTable from '@/components/StandingsTable';
import { useSession } from '@/lib/session';
import { computeSeasonRanking } from '@/lib/points';
import { formatDate } from '@/lib/utils';
import { isGroupAdmin } from '@/lib/groupRoles';
import type { Group, MatchWithUsers, Quedada, Season, User } from '@/lib/types';

export default function SeasonClient({
  groupId,
  seasonId,
}: {
  groupId: string;
  seasonId: string;
}) {
  const { user } = useSession();
  const [group, setGroup] = useState<Group | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [members, setMembers] = useState<Array<{ user: User; role: string }>>([]);
  const [quedadas, setQuedadas] = useState<Quedada[]>([]);
  const [matches, setMatches] = useState<MatchWithUsers[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/seasons/${seasonId}`);
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'No se pudo cargar la temporada.');
        return;
      }
      setGroup(data.group as Group);
      setSeason(data.season as Season);
      setMembers((data.members ?? []) as Array<{ user: User; role: string }>);
      setMyRole(data.myRole ?? null);
      setQuedadas((data.quedadas ?? []) as Quedada[]);
      setMatches((data.matches ?? []) as MatchWithUsers[]);
    } catch (err) {
      console.error('Error cargando temporada', err);
      setError('No se pudo cargar la temporada.');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = computeSeasonRanking(
    members.map((m) => m.user),
    matches
  );
  const winner = season?.winner_id
    ? members.find((m) => m.user.id === season.winner_id)
    : null;

  const isAdminHere = isGroupAdmin(user, group, myRole);

  async function closeSeason() {
    if (!season || !user) return;
    const active = quedadas.filter((q) => q.status === 'active');
    if (active.length > 0) {
      alert('Aún hay quedadas activas. Finalízalas antes de cerrar la temporada.');
      return;
    }
    if (!confirm('¿Cerrar la temporada? Se calcula el ganador y queda en solo lectura.')) return;
    setClosing(true);
    const res = await fetch(`/api/seasons/${season.id}/close`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'No se pudo cerrar la temporada.');
    await load();
    setClosing(false);
  }

  if (error) {
    return (
      <div>
        <AppHeader title="Temporada" backHref={`/groups/${groupId}`} />
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
        <AppHeader title="Temporada" backHref={`/groups/${groupId}`} />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  if (!season) {
    return (
      <div>
        <AppHeader title="Temporada" backHref={`/groups/${groupId}`} />
        <main className="mx-auto max-w-lg px-4 py-10 text-center">
          <p className="mb-4 text-sm text-slate-400">Temporada no encontrada.</p>
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
        title={season.name}
        subtitle={group?.name}
        backHref={`/groups/${groupId}`}
      />

      <main className="mx-auto max-w-lg px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <span
            className={
              'rounded-full px-3 py-1 text-xs font-bold ' +
              (season.status === 'active'
                ? 'bg-orange-500/20 text-orange-300'
                : 'bg-slate-700 text-slate-400')
            }
          >
            {season.status === 'active' ? 'En curso' : 'Finalizada'}
          </span>
          <span className="text-xs text-slate-400">
            {formatDate(season.start_date)} — {formatDate(season.end_date)}
          </span>
        </div>

        {winner && (
          <div className="mb-4 rounded-2xl border border-amber-700 bg-amber-950/30 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-amber-300">Ganador de la temporada</p>
            <p className="mt-1 flex items-center justify-center gap-2 text-xl font-extrabold">
              <Trophy size={20} className="text-amber-400" />
              {winner.user.first_name || winner.user.username}
            </p>
          </div>
        )}

        {season.status === 'active' && isAdminHere && (
          <div className="mb-5 flex gap-2">
            <Link href={`/groups/${groupId}/quedadas/new`} className="btn-primary flex-1">
              <Plus size={16} /> Nueva quedada
            </Link>
            <button onClick={closeSeason} disabled={closing} className="btn-secondary flex-1 border-amber-700 text-amber-300 hover:bg-amber-950/30">
              {closing ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
              Cerrar temporada
            </button>
          </div>
        )}

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            Clasificación
          </h2>
          <StandingsTable rows={rows} highlightUserId={user?.id} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            Quedadas
          </h2>
          {quedadas.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Sin quedadas todavía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {quedadas.map((q) => {
                const done = q.status === 'completed';
                return (
                  <Link
                    key={q.id}
                    href={`/groups/${groupId}/quedadas/${q.id}`}
                    className="card flex items-center justify-between gap-3 hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-slate-500" />
                      <div>
                        <p className="text-sm font-semibold">{q.name || 'Quedada'}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(q.quedada_date)} · {q.courts}{' '}
                          {q.courts === 1 ? 'cancha' : 'canchas'} ·{' '}
                          {q.mode === 'points' ? 'puntos' : 'sets'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                          (done ? 'bg-slate-700 text-slate-400' : 'bg-orange-500/20 text-orange-300')
                        }
                      >
                        {done ? 'Jugada' : 'Activa'}
                      </span>
                      <ChevronRight size={16} className="text-slate-500" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
