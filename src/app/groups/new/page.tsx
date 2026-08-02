'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { useSession } from '@/lib/session';

export default function NewGroupPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (res.ok && data.group) {
        router.push(`/groups/${data.group.id}`);
      } else {
        alert(data.error || 'No se pudo crear el grupo.');
        setSaving(false);
      }
    } catch {
      alert('Error al crear el grupo.');
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <div>
        <AppHeader title="Nuevo grupo" backHref="/" />
        <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="Nuevo grupo" backHref="/" />
      <main className="mx-auto max-w-lg px-4 py-5">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre del grupo</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pádel Quito"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <textarea
              className="input min-h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quién juega, dónde, etc."
            />
          </div>
          <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400">
            Al crear el grupo quedas como administrador. Comparte el código del
            grupo o un enlace de invitación para que otros se unan.
          </p>
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Crear grupo
          </button>
        </form>
      </main>
    </div>
  );
}
