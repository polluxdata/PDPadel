'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Shield, Users as UsersIcon, Loader2, Crown } from 'lucide-react';
import AppHeader, { BottomNav } from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { useSession, isSuper } from '@/lib/session';
import { ROLE_LABELS } from '@/lib/constants';
import { displayName, formatDate } from '@/lib/utils';
import type { Group, User } from '@/lib/types';

export default function AdminPanel() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pinGroup, setPinGroup] = useState('');
  const [pinRole, setPinRole] = useState<'player' | 'admin'>('player');
  const [invite, setInvite] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!loading && !isSuper(user)) router.replace('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !isSuper(user)) return;
    (async () => {
      const [{ data: g }, { data: u }] = await Promise.all([
        supabase.from('groups').select('*').order('name'),
        supabase.from('users').select('*').order('username'),
      ]);
      if (g) setGroups(g as Group[]);
      if (u) setUsers(u as User[]);
    })();
  }, [supabase, user]);

  async function generateInvite() {
    if (!pinGroup) return;
    setGenerating(true);
    const res = await fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: pinGroup, role: pinRole }),
    });
    const data = await res.json();
    setGenerating(false);
    if (res.ok) setInvite(data.url);
    else alert(data.error || 'No se pudo generar el enlace.');
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
        <section className="card mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            <Crown size={15} className="text-amber-400" /> Generar enlace de invitación
          </h2>
          <label className="label">Grupo</label>
          <select
            className="input mb-3"
            value={pinGroup}
            onChange={(e) => setPinGroup(e.target.value)}
          >
            <option value="">Selecciona un grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setPinRole('player')}
              className={
                'flex-1 rounded-xl border py-2 text-sm font-semibold ' +
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
                'flex-1 rounded-xl border py-2 text-sm font-semibold ' +
                (pinRole === 'admin'
                  ? 'border-amber-500 bg-amber-500 text-slate-950'
                  : 'border-slate-700 bg-slate-800 text-slate-300')
              }
            >
              Administrador
            </button>
          </div>
          <button onClick={generateInvite} disabled={generating || !pinGroup} className="btn-secondary w-full">
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
            <Shield size={15} /> Grupos ({groups.length})
          </h2>
          <div className="flex flex-col gap-2">
            {groups.map((g) => (
              <div key={g.id} className="card flex items-center justify-between !p-3">
                <p className="text-sm font-semibold">{g.name}</p>
                <span className="text-xs text-slate-500">
                  {g.status === 'active' ? 'Activo' : 'Cerrado'}
                </span>
              </div>
            ))}
            {groups.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-500">Sin grupos.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            <UsersIcon size={15} /> Usuarios ({users.length})
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase text-slate-400">
                  <th className="px-3 py-2.5 font-medium">Usuario</th>
                  <th className="px-3 py-2.5 font-medium">Rol</th>
                  <th className="px-3 py-2.5 font-medium">Alta</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/50 last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{displayName(u)}</p>
                      <p className="text-xs text-slate-500">@{u.username}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                          (u.role === 'super_admin'
                            ? 'bg-amber-500/20 text-amber-300'
                            : u.role === 'admin'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-700 text-slate-400')
                        }
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <BottomNav active="admin" />
    </div>
  );
}
