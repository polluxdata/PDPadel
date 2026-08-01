'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Plus, UserCircle2, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: { label: string; href: string };
}) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        {backHref ? (
          <Link
            href={backHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </Link>
        ) : (
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            aria-label="Inicio"
          >
            <Home size={18} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        {action && (
          <Link href={action.href} className="btn-primary !px-3 !py-2 text-sm">
            <Plus size={16} />
            {action.label}
          </Link>
        )}
        <Link
          href="/profile"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
          aria-label="Mi perfil"
        >
          <UserCircle2 size={20} />
        </Link>
        <button
          onClick={logout}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

export function BottomNav({
  active,
  extra,
}: {
  active?: 'home' | 'profile' | 'admin';
  extra?: { label: string; href: string };
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch">
        <NavLink href="/" label="Inicio" active={active === 'home'} />
        {extra && <NavLink href={extra.href} label={extra.label} />}
        <NavLink href="/profile" label="Perfil" active={active === 'profile'} />
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex-1 py-3 text-center text-sm font-medium transition',
        active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
      )}
    >
      {label}
    </Link>
  );
}
