'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Hash } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/session';
import { audit } from '@/lib/audit';

export default function JoinGroupPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading } = useSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!user || !code.trim()) return;
    setJoining(true);

    const { data: group, error: gErr } = await supabase
      .from('groups')
      .select('id, name, status')
      .ilike('code', code.trim())
      .maybeSingle();

    if (gErr || !group) {
      setJoining(false);
      setError('No se encontró ningún grupo con ese código.');
      return;
    }
    if (group.status !== 'active') {
      setJoining(false);
      setError('Ese grupo está cerrado.');
      return;
    }

    const { error } = await supabase
      .from('group_members')
      .upsert({ group_id: group.id, user_id: user.id, role: 'player' }, { onConflict: 'group_id,user_id' });

    if (error) {
      setJoining(false);
      setError('No se pudo unir: ' + error.message);
      return;
    }

    await audit(supabase, {
      userId: user.id,
      action: 'join_group',
      entity: 'group',
      entityId: group.id,
      details: { code: code.trim() },
    });

    setJoining(false);
    router.push(`/groups/${group.id}`);
    router.refresh();
  }

  if (loading || !user) {
    return (
      <div>
        <AppHeader title="Unirse a un grupo" backHref="/" />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="Unirse a un grupo" backHref="/" />
      <main className="mx-auto max-w-lg px-4 py-5">
        <div className="card mb-5 flex flex-col items-center gap-2 py-8 text-center">
          <Hash size={28} className="text-emerald-400" />
          <p className="text-sm text-slate-300">
            Ingresa el código del grupo para unirte (rol jugador).
          </p>
          <p className="text-xs text-slate-500">
            Pide el código a un administrador o entra con el enlace de
            invitación que te compartieron por WhatsApp.
          </p>
        </div>

        <form onSubmit={join} className="flex flex-col gap-3">
          <input
            className="input text-center text-2xl uppercase tracking-[0.4em]"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            autoFocus
          />
          {error && <p className="text-center text-sm text-rose-400">{error}</p>}
          <button type="submit" disabled={joining || !code.trim()} className="btn-primary">
            {joining ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Unirme al grupo
          </button>
        </form>
      </main>
    </div>
  );
}
