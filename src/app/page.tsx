'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, ChevronRight, Shield, Trophy, Plus, UserCircle2, CalendarClock } from 'lucide-react';
import AppHeader, { BottomNav } from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { useSession, isSuper, isAdmin } from '@/lib/session';
import { displayName, formatDate } from '@/lib/utils';
import type { Group, Season } from '@/lib/types';

interface GroupWithMeta extends Group {
  myRole: 'admin' | 'member';
  currentSeason?: Season | null;
}

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: sessionLoading } = useSession();
  const [groups, setGroups] = useState<GroupWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Si la sesión cargó y no hay usuario (cookie ausente), volver al login.
  useEffect(() => {
    if (!sessionLoading && !user) {
      router.replace('/login');
    }
  }, [sessionLoading, user, router]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        let groupRows: Group[] = [];

        if (isSuper(user)) {
          const { data } = await supabase.from('groups').select('*').order('name');
          groupRows = (data ?? []) as Group[];
        } else {
          const [{ data: mine }, { data: owned }] = await Promise.all([
            supabase
              .from('group_members')
              .select('group:groups(*)')
              .eq('user_id', user.id),
            supabase.from('groups').select('*').eq('admin_id', user.id),
          ]);
          const asMember = ((mine ?? []) as unknown as Array<{ group: Group | null }>)
            .map((r) => r.group)
            .filter(Boolean) as Group[];
          groupRows = Array.from(
            new Map(
              [...asMember, ...((owned ?? []) as Group[])].map((g) => [g.id, g])
            ).values()
          );
        }

        const meta: GroupWithMeta[] = groupRows.map((g) => ({
          ...g,
          myRole: g.admin_id === user.id ? 'admin' : 'member',
        }));

        if (groupRows.length > 0) {
          const { data: seasons } = await supabase
            .from('seasons')
            .select('*')
            .in('group_id', groupRows.map((g) => g.id))
            .eq('status', 'active');
          const activeSeasons = new Map(
            ((seasons ?? []) as Season[]).map((s) => [s.group_id, s])
          );
          for (const g of meta) g.currentSeason = activeSeasons.get(g.id) ?? null;
        }

        setGroups(meta);
      } catch (err) {
        console.error('Error cargando inicio', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase, user]);

  if (sessionLoading || (loading && !user)) {
    return (
      <div>
        <AppHeader title="PDPadel" />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="pb-20">
      <AppHeader title="PDPadel" />

      <main className="mx-auto max-w-lg px-4 py-5">
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-black text-slate-950">
            {displayName(user).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{displayName(user)}</p>
            <p className="text-xs text-slate-400">@{user.username}</p>
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            <UserCircle2 size={14} />
            Editar
          </Link>
        </div>

        {isSuper(user) && (
          <Link
            href="/admin"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-700 bg-amber-950/30 p-4 hover:bg-amber-950/50"
          >
            <Shield size={20} className="text-amber-400" />
            <span className="flex-1 text-sm font-semibold text-amber-200">
              Panel del super administrador
            </span>
            <ChevronRight size={18} className="text-amber-400" />
          </Link>
        )}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            <Users size={15} /> Mis grupos
          </h2>
          {isAdmin(user) && (
            <Link href="/groups/new" className="btn-primary !px-3 !py-1.5 text-xs">
              <Plus size={14} /> Nuevo grupo
            </Link>
          )}
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Cargando…</p>
        ) : groups.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-8 text-center">
            <Users size={26} className="text-slate-500" />
            <p className="text-sm text-slate-300">Aún no perteneces a ningún grupo</p>
            <p className="text-xs text-slate-500">
              {isAdmin(user)
                ? 'Crea un grupo o únete con un PIN de invitación.'
                : 'Pide un PIN de invitación a un administrador.'}
            </p>
            {isAdmin(user) && (
              <Link href="/groups/new" className="btn-primary mt-2">
                Crear grupo
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="card flex items-center justify-between gap-3 hover:border-slate-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-semibold">
                    {g.name}
                    {g.myRole === 'admin' && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        ADMIN
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    {g.currentSeason ? (
                      <>
                        <Trophy size={12} className="text-amber-400" />
                        Temporada: {g.currentSeason.name}
                      </>
                    ) : (
                      <>
                        <CalendarClock size={12} />
                        Sin temporada activa
                      </>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {g.description || formatDate(g.created_at)}
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-slate-500" />
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav active="home" />
    </div>
  );
}
