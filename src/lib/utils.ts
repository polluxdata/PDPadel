import type { User } from './types';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function displayName(u: { first_name?: string; last_name?: string; nickname?: string | null; username?: string } | null | undefined): string {
  if (!u) return '???';
  if (u.nickname) return u.nickname;
  const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  return full || u.username || '???';
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

export function teamLabel(users: Array<User | null | undefined>): string {
  return users.filter(Boolean).map(displayName).join(' & ') || '???';
}
