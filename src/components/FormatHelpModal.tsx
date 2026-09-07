'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function FormatHelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Diferencia entre Americano y Mexicano"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Americano vs Mexicano</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          <section className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
            <h3 className="mb-1.5 font-bold text-orange-400">Americano</h3>
            <ul className="list-disc space-y-1 pl-4 text-slate-300">
              <li>El calendario completo se arma de antemano.</li>
              <li>Las parejas rotan para jugar <b>con y contra todos</b>.</li>
              <li>Exactamente <b>canchas × 4</b> jugadores.</li>
              <li>Ideal si quieres variedad de parejas garantizada.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
            <h3 className="mb-1.5 font-bold text-orange-400">Mexicano</h3>
            <ul className="list-disc space-y-1 pl-4 text-slate-300">
              <li>La ronda 1 se sortea <b>al azar</b>.</li>
              <li>Cada ronda siguiente se arma con la clasificación: bloques de 4 por cancha (la 1 con los líderes), cruce <b>1.º + 4.º vs 2.º + 3.º</b>.</li>
              <li>Se genera al completar todos los partidos de la ronda.</li>
              <li>Mínimo <b>canchas × 4</b> jugadores; los que sobran descansan con rotación justa.</li>
              <li>Partidos más parejos: juegas contra gente de tu nivel.</li>
            </ul>
          </section>

          <p className="text-xs text-slate-500">
            En ambos, la puntuación es individual y el marcador (puntos o set
            único) se elige aparte. Las parejas pueden repetirse en el
            Mexicano; en el Americano no.
          </p>
        </div>

        <button onClick={onClose} className="btn-primary mt-4 w-full">
          Entendido
        </button>
      </div>
    </div>
  );
}
