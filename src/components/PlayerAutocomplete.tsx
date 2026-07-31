'use client';

import { useCallback, useRef, useState } from 'react';
import { Check, UserPlus } from 'lucide-react';
import type { Player } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 250;

export default function PlayerAutocomplete({
  label,
  onSelect,
  selected,
}: {
  label: string;
  onSelect: (player: { id: string | null; name: string }) => void;
  selected?: boolean;
}) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Player[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useRef(createClient()).current;

  const query = useCallback(
    async (term: string) => {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('id, name')
        .ilike('name', `%${term}%`)
        .order('name')
        .limit(8);
      if (!error) setSuggestions((data ?? []) as Player[]);      setLoading(false);
    },
    [supabase]
  );

  function handleChange(term: string) {
    setValue(term);
    onSelect({ id: null, name: term.trim() });
    if (timer.current) clearTimeout(timer.current);
    if (!term.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setOpen(true);
    timer.current = setTimeout(() => query(term.trim()), DEBOUNCE_MS);
  }

  function pick(p: Player) {
    setValue(p.name);
    setSuggestions([]);
    setOpen(false);
    onSelect({ id: p.id, name: p.name });
  }

  return (
    <div className="relative">
      <label className="label">
        <span className="inline-flex items-center gap-1">
          {label}
          {selected && <Check size={14} className="text-emerald-400" />}
        </span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => value.trim() && setOpen(true)}
        placeholder="Nombre del jugador"
        autoComplete="off"
        className="input"
      />
      {open && (suggestions.length > 0 || loading) && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-800 shadow-xl">
          {loading && (
            <li className="px-4 py-3 text-sm text-slate-400">Buscando…</li>
          )}
          {suggestions.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => pick(p)}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-700'
                )}
              >
                <span className="font-medium">{p.name}</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  EXISTE
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-slate-700">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs text-slate-400 hover:bg-slate-700"
            >
              <UserPlus size={14} />
              {value.trim() ? `Registrar "${value.trim()}" como nuevo` : 'Cerrar'}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
