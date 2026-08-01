'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Flag, Loader2, Users } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import MatchCard from '@/components/MatchCard';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/session';
import { audit } from '@/lib/audit';
import { displayName, formatDate } from '@/lib/utils';
import { MODE_LABELS } from '@/lib/constants';
import type { Group, MatchWithUsers, Quedada, User } from '@/lib/types';

export default function QuedadaPage() {
  const params = useParams<{ id: string; qid: string }>();
  const supabase = useRef(createClient()).current;
  const { user } = useSession();
  const [group, setGroup] = useState<Group | null>(null);
  const [quedada, setQuedada] = useState<Quedada | null>(null);
  const [matches, setMatches] = useState<MatchWithUsers[]>([]);
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [skipping, setSkipping] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const load = useCallback(async () => {
    const [{ data: g }, { data: q }, { data: mt }, { data: qp }] =
      await Promise.all([
        supabase.from('groups').select('*').eq('id', params.id).maybeSingle(),
        supabase.from('quedadas').select('*').eq('id', params.qid).maybeSingle(),
        supabase
          .from('matches')
          .select('*, p1:users!player1_id(*), p2:users!player2_id(*), p3:users!player3_id(*), p4:users!player4_id(*)')
          .eq('quedada_id', params.qid)
          .order('round_number')
          .order('court_number'),
        supabase
          .from('quedada_players')
          .select('user:users(*)')
          .eq('quedada_id', params.qid),
      ]);
    if (g) setGroup(g as Group);
    if (q) setQuedada(q as Quedada);
    if (mt) setMatches(mt as MatchWithUsers[]);
    if (qp) {
      setPlayers(
        ((qp as unknown as Array<{ user: User | null }>))
          .map((r) => r.user)
          .filter(Boolean) as User[]
      );
    }
    setLoading(false);
  }, [supabase, params.id, params.qid]);

  useEffect(() => {
    load();
  }, [load]);

  const isAdminHere =
    !!user && (user.role === 'super_admin' || group?.admin_id === user.id);

  async function skipMatch(id: string) {
    if (!user) return;
    if (!confirm('¿Saltar este partido? No contará para la clasificación.')) return;
    setSkipping(id);
    await supabase.from('matches').update({ status: 'skipped' }).eq('id', id);
    await audit(supabase, {
      userId: user.id,
      action: 'skip_match',
      entity: 'match',
      entityId: id,
    });
    setSkipping(null);
    await load();
  }

  async function finishQuedada() {
    if (!quedada || !user) return;
    const pending = matches.filter((m) => m.status === 'pending' || m.status === 'in_progress');
    if (pending.length > 0) {
      if (!confirm(`${pending.length} partido(s) sin jugar. ¿Finalizar igualmente?`)) return;
    }
    if (!confirm('¿Finalizar la quedada? Los puntos se suman al ranking de la temporada.')) return;
    setFinishing(true);
    await supabase.from('quedadas').update({ status: 'completed' }).eq('id', quedada.id);
    await audit(supabase, {
      userId: user.id,
      action: 'finish_quedada',
      entity: 'quedada',
      entityId: quedada.id,
    });
    await load();
    setFinishing(false);
  }

  const rounds = Array.from(new Set(matches.map((m) => m.round_number)));
  const total = matches.length;
  const done = matches.filter((m) => m.status === 'completed' || m.status === 'skipped').length;

  if (loading || !quedada) {
    return (
      <div>
        <AppHeader title="Quedada" backHref={`/groups/${params.id}`} />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <AppHeader
        title={quedada.name || 'Quedada'}
        subtitle={`${formatDate(quedada.quedada_date)} · ${quedada.courts} ${quedada.courts === 1 ? 'cancha' : 'canchas'} · ${MODE_LABELS[quedada.mode]}`}
        backHref={`/groups/${params.id}`}
      />

      <main className="mx-auto max-w-lg px-4 py-5">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5">
          <span className="flex items-center gap-2 text-xs text-slate-400">
            <Users size={14} className="text-emerald-400" />
            {players.map(displayName).join(', ')}
          </span>
        </div>

        {quedada.status === 'completed' && (
          <div className="mb-4 rounded-xl border border-amber-700 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
            Quedada finalizada. Los puntos ya cuentan en el ranking de la temporada.
          </div>
        )}

        {matches.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Sin partidos generados.</p>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="card text-center">
                <p className="text-2xl font-extrabold text-emerald-400">{done}/{total}</p>
                <p className="text-xs text-slate-400">Partidos jugados</p>
              </div>
              <div className="card text-center">
                <p className="text-2xl font-extrabold">{rounds.length}</p>
                <p className="text-xs text-slate-400">Rondas</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {rounds.map((round) => (
                <section key={round}>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                    Ronda {round}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {matches
                      .filter((m) => m.round_number === round)
                      .map((m) => (
                        <MatchCard
                          key={m.id}
                          match={m}
                          groupId={params.id}
                          onSkip={quedada.status === 'active' && isAdminHere ? skipMatch : undefined}
                          busy={skipping === m.id}
                          admin={isAdminHere}
                        />
                      ))}
                  </div>
                </section>
              ))}
            </div>

            {quedada.status === 'active' && isAdminHere && (
              <button
                onClick={finishQuedada}
                disabled={finishing}
                className="btn-secondary mt-6 w-full border-amber-700 text-amber-300 hover:bg-amber-950/30"
              >
                {finishing ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
                Finalizar quedada
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
