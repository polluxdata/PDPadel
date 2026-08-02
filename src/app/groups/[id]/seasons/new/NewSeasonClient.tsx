'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { useSession } from '@/lib/session';

export default function NewSeasonClient({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { user, loading } = useSession();
  const [name, setName] = useState('Temporada');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/groups/${groupId}/seasons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, startDate }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      router.push(`/groups/${groupId}`);
    } else {
      alert(data.error || 'No se pudo crear la temporada.');
    }
  }

  if (loading || !user) {
    return (
      <div>
        <AppHeader title="Nueva temporada" backHref={`/groups/${groupId}`} />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="Nueva temporada" backHref={`/groups/${groupId}`} />
      <main className="mx-auto max-w-lg px-4 py-5">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Fecha de inicio</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400">
            Solo puede haber una temporada en curso por grupo. Al cerrar esta se
            calcula el ganador y queda en solo lectura.
          </p>
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Crear temporada
          </button>
        </form>
      </main>
    </div>
  );
}
