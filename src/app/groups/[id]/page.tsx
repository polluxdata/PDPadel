'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Trophy, Users, Plus, CalendarPlus, UserCog, Flag, ChevronRight,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import StandingsTable from '@/components/StandingsTable';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/session';
import { computeSeasonRanking } from '@/lib/points';
import { displayName } from '@/lib/utils';
import { audit } from '@/lib/audit';
import type { Group, MatchWithUsers, Quedada, Season, User } from '@/lib/types';

export default function GroupPage() {
  const params = useParams<{ id: string }>();
  const supabase = useRef(createClient()).current;
  const { user } = useSession();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [season, setSeason] = useState<Season | null>(null);
  const [matches, setMatches] = useState<MatchWithUsers[]>([]);
  const [quedadas, setQuedadas] = useState<Quedada[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: g }, { data: gm }, { data: s }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', params.id).maybeSingle(),
      supabase
        .from('group_members')
        .select('user:users(*)')
        .eq('group_id', params.id),
      supabase
        .from('seasons')
        .select('*')
        .eq('group_id', params.id)
        .eq('status', 'active')
        .maybeSingle(),
    ]);

    if (g) setGroup(g as Group);
    if (gm) {
      setMembers(
        ((gm as unknown as Array<{ user: User | null }>))
          .map((r) => r.user)
          .filter(Boolean) as User[]
      );
    }
    if (s) {
      setSeason(s as Season);
      const { data: qs } = await supabase
        .from('quedadas')
        .select('*')
        .eq('season_id', (s as Season).id);
      const q = (qs ?? []) as Quedada[];
      setQuedadas(q);
      const modeByQ = new Map(q.map((x) => [x.id, x.mode]));
      if (q.length > 0) {
        const { data: ms } = await supabase
          .from('matches')
          .select('*, p1:users!player1_id(*), p2:users!player2_id(*), p3:users!player3_id(*), p4:users!player4_id(*)')
          .in('quedada_id', q.map((x) => x.id));
        setMatches(
          ((ms ?? []) as MatchWithUsers[]).map((m) => ({
            ...m,
            mode: modeByQ.get(m.quedada_id),
          }))
        );
      } else {
        setMatches([]);
      }
    } else {
      setSeason(null);
      setMatches([]);
      setQuedadas([]);
    }
    setLoading(false);
  }, [supabase, params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = computeSeasonRanking(members, matches);
  const myRank = user ? rows.findIndex((r) => r.userId === user.id) + 1 : null;

  const isAdminHere =
    !!user &&
    (user.role === 'super_admin' || group?.admin_id === user.id);

  async function closeGroup() {
    if (!group || !user) return;
    if (!confirm('¿Cerrar el grupo? Quedará en solo lectura.')) return;
    await supabase.from('groups').update({ status: 'closed' }).eq('id', group.id);
    await audit(supabase, { userId: user.id, action: 'close_group', entity: 'group', entityId: group.id });
    setGroup({ ...group, status: 'closed' });
  }

  if (loading || !group) {
    return (
      <div>
        <AppHeader title="Grupo" backHref="/" />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  const activeQuedadas = quedadas.filter((q) => q.status === 'active');

  return (
    <div>
      <AppHeader title={group.name} subtitle={`${members.length} jugadores`} backHref="/" />

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
                className="text-xs font-semibold text-emerald-400"
              >
                Ver temporada <ChevronRight size={12} className="inline" />
              </Link>
            </div>

            <div className="card mb-3 flex items-center justify-between border-emerald-800 bg-emerald-950/20">
              <div>
                <p className="font-bold text-emerald-300">{season.name}</p>
                <p className="text-xs text-slate-400">
                  {activeQuedadas.length > 0
                    ? `${activeQuedadas.length} quedada(s) activa(s)`
                    : 'Sin quedadas activas'}
                </p>
              </div>
              {myRank && (
                <div className="text-center">
                  <p className="text-3xl font-black text-emerald-400">#{myRank}</p>
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
            {members.map((m) => (
              <div key={m.id} className="card flex items-center gap-3 !p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 font-bold text-emerald-400">
                  {displayName(m).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{displayName(m)}</p>
                  <p className="truncate text-xs text-slate-500">
                    @{m.username}
                    {group.admin_id === m.id ? ' · Admin' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
