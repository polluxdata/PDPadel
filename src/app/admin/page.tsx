'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Users as UsersIcon, Search, ChevronLeft, ChevronRight, Trash2, LogIn,
} from 'lucide-react';
import AppHeader, { BottomNav } from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { useSession, isSuper } from '@/lib/session';
import { ROLE_LABELS } from '@/lib/constants';
import { displayName, formatDate } from '@/lib/utils';
import { audit } from '@/lib/audit';
import type { Group, User } from '@/lib/types';

export default function AdminPanel() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!loading && !isSuper(user)) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !isSuper(user)) return;
    (async () => {
      const { data: g } = await supabase.from('groups').select('*').order('name');
      if (g) setGroups(g as Group[]);
    })();
  }, [supabase, user]);

  async function closeGroup(g: Group) {
    if (!user) return;
    if (!confirm(`¿Cerrar el grupo "${g.name}"? Quedará en solo lectura.`)) return;
    await supabase.from('groups').update({ status: 'closed' }).eq('id', g.id);
    await audit(supabase, {
      userId: user.id,
      action: 'close_group',
      entity: 'group',
      entityId: g.id,
    });
    setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, status: 'closed' } : x)));
  }

  if (loading || !user || !isSuper(user)) {
    return (
      <div>
        <AppHeader title="Admin" backHref="/" />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <AppHeader title="Panel de administración" backHref="/" />

      <main className="mx-auto max-w-lg px-4 py-5">
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            <Shield size={15} /> Grupos ({groups.length})
          </h2>
          <div className="flex flex-col gap-2">
            {groups.map((g) => (
              <div key={g.id} className="card flex items-center justify-between gap-2 !p-3">
                <Link
                  href={`/groups/${g.id}`}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold hover:text-emerald-400"
                >
                  <span className="truncate">{g.name}</span>
                  <LogIn size={13} className="shrink-0 text-slate-500" />
                </Link>
                <span className="shrink-0 text-xs text-slate-500">
                  {g.status === 'active' ? 'Activo' : 'Cerrado'}
                </span>
                {g.status === 'active' && (
                  <button
                    onClick={() => closeGroup(g)}
                    className="btn-secondary shrink-0 !px-2 !py-1 text-xs"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            ))}
            {groups.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-500">Sin grupos.</p>
            )}
          </div>
        </section>

        <UsersAdmin />
      </main>

      <BottomNav active="admin" />
    </div>
  );
}

type UserFilter = 'all' | 'super' | 'group_admin' | 'no_groups';

interface Membership {
  adminIn: string[];
  playerIn: string[];
}

function UsersAdmin() {
  const supabase = useRef(createClient()).current;
  const { user: me } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [memberships, setMemberships] = useState<Record<string, Membership>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PAGE_SIZE = 20;

  async function deleteUser(u: User) {
    if (u.role === 'super_admin' || u.id === me?.id) return;
    const typed = prompt(`Para confirmar, escribe el usuario "${u.username}":`);
    if (typed === null) return;
    if (typed.trim() !== u.username) {
      alert('El usuario escrito no coincide. No se borró nada.');
      return;
    }
    if (!confirm('Esta acción no se puede deshacer. ¿Borrar al jugador?')) return;
    await supabase.from('users').delete().eq('id', u.id);
    await audit(supabase, {
      userId: me?.id ?? '',
      action: 'delete_user',
      entity: 'user',
      entityId: u.id,
      details: { username: u.username },
    });
    await load();
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let idFilter: string[] | null = null;
      if (filter === 'group_admin' || filter === 'no_groups') {
        const { data } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('role', 'admin');
        const ids = new Set((data ?? []).map((r) => (r as unknown as { user_id: string }).user_id));
        if (filter === 'group_admin') {
          idFilter = Array.from(ids);
        } else {
          // no_groups: todos los miembros (para excluirlos)
          const all = await supabase.from('group_members').select('user_id');
          idFilter = Array.from(
            new Set((all.data ?? []).map((r) => (r as unknown as { user_id: string }).user_id))
          );
        }
        if (filter === 'group_admin' && idFilter.length === 0) {
          setUsers([]);
          setMemberships({});
          setTotal(0);
          return;
        }
      }

      let builder = supabase
        .from('users')
        .select('*', { count: 'exact' });

      if (query.trim()) {
        const q = query.trim();
        builder = builder.or(`username.ilike.%${q}%,email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
      }
      if (filter === 'super') {
        builder = builder.eq('role', 'super_admin');
      } else if (filter === 'group_admin' && idFilter) {
        builder = builder.in('id', idFilter);
      } else if (filter === 'no_groups' && idFilter) {
        builder = builder.not('id', 'in', `(${idFilter.join(',')})`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const { data, count } = await builder
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      const rows = (data ?? []) as User[];
      setUsers(rows);
      setTotal(count ?? 0);

      if (rows.length > 0) {
        const { data: ms } = await supabase
          .from('group_members')
          .select('user_id, role, group:groups(name)')
          .in('user_id', rows.map((u) => u.id));
        const map: Record<string, Membership> = {};
        for (const r of (ms ?? []) as unknown as Array<{ user_id: string; role: string; group: { name: string } | null }>) {
          if (!r.group) continue;
          if (!map[r.user_id]) map[r.user_id] = { adminIn: [], playerIn: [] };
          if (r.role === 'admin') map[r.user_id].adminIn.push(r.group.name);
          else map[r.user_id].playerIn.push(r.group.name);
        }
        setMemberships(map);
      } else {
        setMemberships({});
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, page, query, filter]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce de búsqueda.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPage(1), 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, filter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fromShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toShown = Math.min(total, page * PAGE_SIZE);

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
        <UsersIcon size={15} /> Usuarios ({total})
      </h2>

      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input !pl-9 !py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar usuario/email/nombre"
          />
        </div>
        <select
          className="input !w-36 !py-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as UserFilter)}
        >
          <option value="all">Todos</option>
          <option value="super">Super admin</option>
          <option value="group_admin">Admin de grupo</option>
          <option value="no_groups">Sin grupos</option>
        </select>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Cargando…</p>
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Sin usuarios.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <ul className="divide-y divide-slate-800">
            {users.map((u) => {
              const m = memberships[u.id];
              return (
                <li key={u.id} className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{displayName(u)}</p>
                      <p className="truncate text-xs text-slate-500">@{u.username} · {formatDate(u.created_at)}</p>
                    </div>
                    <span
                      className={
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                        (u.role === 'super_admin'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-700 text-slate-400')
                      }
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                    {u.role !== 'super_admin' && u.id !== me?.id && (
                      <button
                        onClick={() => deleteUser(u)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-400 hover:bg-slate-800"
                        aria-label={`Borrar a ${u.username}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  {(m?.adminIn.length || m?.playerIn.length) ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m?.adminIn.map((g) => (
                        <span key={'a' + g} className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                          Admin · {g}
                        </span>
                      ))}
                      {m?.playerIn.map((g) => (
                        <span key={'p' + g} className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-400">
                          Jugador · {g}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-[10px] text-slate-600">Sin grupos</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          className="btn-secondary !px-3 !py-1.5 text-xs"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="text-xs text-slate-400">
          {fromShown}–{toShown} de {total}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          className="btn-secondary !px-3 !py-1.5 text-xs"
        >
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </section>
  );
}
