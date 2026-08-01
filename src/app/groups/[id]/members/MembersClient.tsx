'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Copy, KeyRound, Search, Trash2, UserPlus } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/session';
import { displayName } from '@/lib/utils';
import { audit } from '@/lib/audit';
import { isGroupAdmin } from '@/lib/groupRoles';
import type { Group, User } from '@/lib/types';

export default function MembersClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const { user, loading } = useSession();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [pinRole, setPinRole] = useState<'player' | 'admin'>('player');
  const [invite, setInvite] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    const [{ data: g }, { data: gm }, { data: mine }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).maybeSingle(),
      supabase
        .from('group_members')
        .select('user:users(*)')
        .eq('group_id', groupId),
      user
        ? supabase
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (g) setGroup(g as Group);
    if (mine) setMyRole((mine as { role?: string }).role ?? null);
    if (gm) {
      setMembers(
        ((gm as unknown as Array<{ user: User | null }>))
          .map((r) => r.user)
          .filter(Boolean) as User[]
      );
    }
  }, [supabase, groupId, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loading && !user) return;
    if (!loading && group && !isGroupAdmin(user, group, myRole)) {
      router.replace(`/groups/${groupId}`);
    }
  }, [loading, user, group, myRole, groupId, router]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, email, nickname, role, listed')
      .ilike('username', `%${query.trim()}%`)
      .eq('listed', true)
      .order('username')
      .limit(6);
    setResults((data ?? []) as User[]);
    setSearching(false);
  }

  async function addMember(member: User) {
    if (!user) return;
    const { error } = await supabase
      .from('group_members')
      .upsert({ group_id: groupId, user_id: member.id }, { onConflict: 'group_id,user_id' });
    if (error) {
      alert(error.message);
      return;
    }
    await audit(supabase, {
      userId: user.id,
      action: 'add_member',
      entity: 'group_member',
      details: { group_id: groupId, user_id: member.id },
    });
    setResults([]);
    setQuery('');
    await load();
  }

  async function removeMember(member: User) {
    if (!user) return;
    if (!confirm(`¿Quitar a ${displayName(member)} del grupo?`)) return;
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', member.id);
    await audit(supabase, {
      userId: user.id,
      action: 'remove_member',
      entity: 'group_member',
      details: { group_id: groupId, user_id: member.id },
    });
    await load();
  }

  async function generateInvite() {
    if (!user) return;
    setGenerating(true);
    const res = await fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, role: pinRole }),
    });
    const data = await res.json();
    setGenerating(false);
    if (res.ok) {
      setInvite(data.url);
    } else {
      alert(data.error || 'No se pudo generar el enlace.');
    }
  }

  if (loading || !group) {
    return (
      <div>
        <AppHeader title="Jugadores" backHref={`/groups/${groupId}`} />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="Jugadores" subtitle={group.name} backHref={`/groups/${groupId}`} />

      <main className="mx-auto max-w-lg px-4 py-5">
        <section className="card mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            <KeyRound size={15} className="text-emerald-400" /> Enlace de invitación
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Genera un enlace y compártelo por WhatsApp. Quien lo abra, verifica su
            correo y queda dentro del grupo.
          </p>
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setPinRole('player')}
              className={
                'flex-1 rounded-xl border py-2 text-sm font-semibold transition ' +
                (pinRole === 'player'
                  ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                  : 'border-slate-700 bg-slate-800 text-slate-300')
              }
            >
              Jugador
            </button>
            <button
              onClick={() => setPinRole('admin')}
              className={
                'flex-1 rounded-xl border py-2 text-sm font-semibold transition ' +
                (pinRole === 'admin'
                  ? 'border-amber-500 bg-amber-500 text-slate-950'
                  : 'border-slate-700 bg-slate-800 text-slate-300')
              }
            >
              Administrador
            </button>
          </div>
          <button onClick={generateInvite} disabled={generating} className="btn-secondary w-full">
            {generating && <Loader2 size={16} className="animate-spin" />}
            Generar enlace
          </button>
          {invite && (
            <div className="mt-3 rounded-xl border border-emerald-700 bg-emerald-950/30 p-3">
              <p className="mb-2 text-center text-xs text-slate-400">
                Enlace para {pinRole === 'admin' ? 'administrador' : 'jugador'} (válido 7 días):
              </p>
              <p className="break-all rounded-lg bg-slate-900 px-3 py-2 text-xs text-emerald-300">
                {invite}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(invite)}
                className="btn-ghost mt-2 w-full !py-1.5 text-xs"
              >
                <Copy size={14} /> Copiar enlace
              </button>
            </div>
          )}
        </section>

        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            <UserPlus size={15} /> Agregar jugador
          </h2>
          <form onSubmit={search} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="input !pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por usuario"
              />
            </div>
            <button type="submit" disabled={searching || !query.trim()} className="btn-secondary">
              Buscar
            </button>
          </form>
          {results.length > 0 && (
            <ul className="mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => addMember(r)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-700"
                  >
                    <span>
                      <span className="font-medium">{displayName(r)}</span>
                      <span className="ml-2 text-xs text-slate-400">@{r.username}</span>
                    </span>
                    <UserPlus size={16} className="text-emerald-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            Miembros ({members.length})
          </h2>
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div key={m.id} className="card flex items-center gap-3 !p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 font-bold text-emerald-400">
                  {displayName(m).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {displayName(m)}
                    {group.admin_id === m.id && (
                      <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        ADMIN
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-500">@{m.username}</p>
                </div>
                {m.id !== group.admin_id && user?.id !== m.id && (
                  <button
                    onClick={() => removeMember(m)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-400 hover:bg-slate-800"
                    aria-label={`Quitar a ${m.username}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
