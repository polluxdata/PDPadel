export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function teamLabel(
  players: Array<{ id?: string; name: string } | null | undefined>
): string {
  const names = players
    .filter((p) => p)
    .map((p) => p!.name)
    .join(' & ');
  return names || '???';
}
