'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Flag, Loader2, Plus, Trophy, ChevronRight, Calendar } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import StandingsTable from '@/components/StandingsTable';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/session';
import { computeSeasonRanking } from '@/lib/points';
import { formatDate } from '@/lib/utils';
import { audit } from '@/lib/audit';
import type { Group, MatchWithUsers, Quedada, Season, User } from '@/lib/types';

export default function SeasonPage() {
  const params = useParams<{ groupId: string; seasonId: string }>();
  const supabase = useRef(createClient()).current;
  const { user } = useSession();
  const [group, setGroup] = useState<Group | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [quedadas, setQuedadas] = useState<Quedada[]>([]);
  const [matches, setMatches] = useState<MatchWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    const [{ data: g }, { data: s }, { data: gm }, { data: qs }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', params.groupId).maybeSingle(),
      supabase.from('seasons').select('*').eq('id', params.seasonId).maybeSingle(),
      supabase
        .from('group_members')
        .select('user:users(*)')
        .eq('group_id', params.groupId),
      supabase.from('quedadas').select('*').eq('season_id', params.seasonId).order('created_at'),
    ]);
    if (g) setGroup(g as Group);
    if (s) setSeason(s as Season);
    if (gm) {
      setMembers(
        ((gm as unknown as Array<{ user: User | null }>))
          .map((r) => r.user)
          .filter(Boolean) as User[]
      );
    }
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
    setLoading(false);
  }, [supabase, params.groupId, params.seasonId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = computeSeasonRanking(members, matches);
  const winner = season?.winner_id
    ? members.find((m) => m.id === season.winner_id)
    : null;

  const isAdminHere =
    !!user && (user.role === 'super_admin' || group?.admin_id === user.id);

  async function closeSeason() {
    if (!season || !user) return;
    const active = quedadas.filter((q) => q.status === 'active');
    if (active.length > 0) {
      alert('Aún hay quedadas activas. Finalízalas antes de cerrar la temporada.');
      return;
    }
    if (!confirm('¿Cerrar la temporada? Se calcula el ganador y queda en solo lectura.')) return;
    setClosing(true);
    const champion = rows[0]?.userId ?? null;
    await supabase
      .from('seasons')
      .update({
        status: 'closed',
        end_date: new Date().toISOString().slice(0, 10),
        winner_id: champion,
      })
      .eq('id', season.id);
    await audit(supabase, {
      userId: user.id,
      action: 'close_season',
      entity: 'season',
      entityId: season.id,
      details: { winner_id: champion },
    });
    await load();
    setClosing(false);
  }

  if (loading || !season) {
    return (
      <div>
        <AppHeader title="Temporada" backHref={`/groups/${params.groupId}`} />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <AppHeader
        title={season.name}
        subtitle={group?.name}
        backHref={`/groups/${params.groupId}`}
      />

      <main className="mx-auto max-w-lg px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <span
            className={
              'rounded-full px-3 py-1 text-xs font-bold ' +
              (season.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-300'
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
              {winner.first_name || winner.username}
            </p>
          </div>
        )}

        {season.status === 'active' && isAdminHere && (
          <div className="mb-5 flex gap-2">
            <Link href={`/groups/${params.groupId}/quedadas/new`} className="btn-primary flex-1">
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
                    href={`/groups/${params.groupId}/quedadas/${q.id}`}
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
                          (done ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/20 text-emerald-300')
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
