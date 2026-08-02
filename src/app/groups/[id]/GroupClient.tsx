'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trophy, Users, Plus, CalendarPlus, UserCog, Flag, ChevronRight,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import StandingsTable from '@/components/StandingsTable';
import { useSession } from '@/lib/session';
import { computeSeasonRanking } from '@/lib/points';
import { displayName } from '@/lib/utils';
import { isGroupAdmin } from '@/lib/groupRoles';
import type { Group, MatchWithUsers, Quedada, Season, User } from '@/lib/types';

export default function GroupClient({ groupId }: { groupId: string }) {
  const { user } = useSession();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Array<{ user: User; role: string }>>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [matches, setMatches] = useState<MatchWithUsers[]>([]);
  const [quedadas, setQuedadas] = useState<Quedada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'No se pudo cargar el grupo.');
        return;
      }
      setGroup(data.group as Group);
      setMembers((data.members ?? []) as Array<{ user: User; role: string }>);
      setMyRole(data.myRole ?? null);
      setSeason((data.season ?? null) as Season | null);
      setQuedadas((data.quedadas ?? []) as Quedada[]);
      setMatches((data.matches ?? []) as MatchWithUsers[]);
    } catch (err) {
      console.error('Error cargando grupo', err);
      setError('No se pudo cargar el grupo.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = computeSeasonRanking(
    members.map((m) => m.user),
    matches
  );
  const myRank = user ? rows.findIndex((r) => r.userId === user.id) + 1 : null;

  const isAdminHere = isGroupAdmin(user, group, myRole);

  async function closeGroup() {
    if (!group || !user) return;
    if (!confirm('¿Cerrar el grupo? Quedará en solo lectura.')) return;
    const res = await fetch(`/api/groups/${group.id}`, { method: 'PATCH' });
    if (res.ok) {
      setGroup({ ...group, status: 'closed' });
    } else {
      const data = await res.json();
      alert(data.error || 'No se pudo cerrar el grupo.');
    }
  }

  if (error) {
    return (
      <div>
        <AppHeader title="Grupo" backHref="/" />
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
        <AppHeader title="Grupo" backHref="/" />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div>
        <AppHeader title="Grupo" backHref="/" />
        <main className="mx-auto max-w-lg px-4 py-10 text-center">
          <p className="mb-4 text-sm text-slate-400">Grupo no encontrado.</p>
          <Link href="/" className="btn-secondary">
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }

  const activeQuedadas = quedadas.filter((q) => q.status === 'active');

  return (
    <div>
      <AppHeader
        title={group.name}
        subtitle={`${members.length} jugadores · Código: ${group.code ?? '—'}`}
        backHref="/"
      />

      <main className="mx-auto max-w-lg px-4 py-5">
        {group.status === 'closed' && (
          <div className="mb-4 rounded-xl border border-amber-700 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
            Grupo cerrado (solo lectura).
          </div>
        )}

        {season ? (
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                <Trophy size={15} className="text-amber-400" />
                Temporada en curso
              </h2>
              <Link
                href={`/groups/${group.id}/seasons/${season.id}`}
                className="text-xs font-semibold text-orange-400"
              >
                Ver temporada <ChevronRight size={12} className="inline" />
              </Link>
            </div>

            <div className="card mb-3 flex items-center justify-between border-orange-800 bg-orange-950/20">
              <div>
                <p className="font-bold text-orange-300">{season.name}</p>
                <div className="text-xs text-slate-400">
                  {activeQuedadas.length === 0 ? (
                    'Sin quedadas activas'
                  ) : (
                    <>
                      <p>
                        {activeQuedadas.length} quedada{activeQuedadas.length > 1 ? 's' : ''} activa{activeQuedadas.length > 1 ? 's' : ''}:
                      </p>
                      <div className="mt-1 flex flex-col gap-1">
                        {activeQuedadas.map((q) => (
                          <Link
                            key={q.id}
                            href={`/groups/${group.id}/quedadas/${q.id}`}
                            className="inline-flex w-fit items-center gap-1 rounded-md bg-orange-500/15 px-2 py-0.5 font-semibold text-orange-300 hover:bg-orange-500/25"
                          >
                            {q.name || 'Quedada'} →
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {myRank && (
                <div className="text-center">
                  <p className="text-3xl font-black text-orange-400">#{myRank}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    tu puesto
                  </p>
                </div>
              )}
            </div>

            <StandingsTable rows={rows} highlightUserId={user?.id} />
          </section>
        ) : (
          <div className="card mb-6 flex flex-col items-center gap-2 py-8 text-center">
            <Trophy size={26} className="text-slate-500" />
            <p className="text-sm text-slate-300">No hay temporada activa</p>
            <p className="text-xs text-slate-500">
              Para crear quedadas hace falta una temporada abierta.
            </p>
            {isAdminHere && group.status === 'active' && (
              <Link href={`/groups/${group.id}/seasons/new`} className="btn-primary mt-2">
                <CalendarPlus size={16} /> Crear temporada
              </Link>
            )}
          </div>
        )}

        {isAdminHere && group.status === 'active' && (
          <div className="mb-6 flex flex-col gap-2">
            <Link
              href={
                season
                  ? `/groups/${group.id}/quedadas/new`
                  : `/groups/${group.id}/seasons/new`
              }
              className="btn-primary w-full"
            >
              <Plus size={16} />
              {season ? 'Crear quedada' : 'Crear temporada'}
            </Link>
            <div className="flex gap-2">
              <Link href={`/groups/${group.id}/members`} className="btn-secondary flex-1">
                <UserCog size={16} /> Jugadores
              </Link>
              <button onClick={closeGroup} className="btn-secondary flex-1 border-rose-700 text-rose-300 hover:bg-rose-950/30">
                <Flag size={16} /> Cerrar grupo
              </button>
            </div>
          </div>
        )}

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            <Users size={15} /> Jugadores del grupo
          </h3>
          <div className="flex flex-col gap-2">
            {members.map((m) => {
              const isOwner = group.admin_id === m.user.id;
              const isAdmin = isOwner || m.role === 'admin';
              return (
                <div key={m.user.id} className="card flex items-center gap-3 !p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 font-bold text-orange-400">
                    {displayName(m.user).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {displayName(m.user)}
                      {isAdmin && (
                        <span className="ml-1.5 rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-bold text-orange-300">
                          ADMIN{isOwner ? ' (dueño)' : ''}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-slate-500">@{m.user.username}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
