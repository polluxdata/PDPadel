'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { PublicUser } from '@/lib/types';

interface SessionValue {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SessionValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Si no hay sesión y cambia la ruta (tras login o magic link), reintenta.
  useEffect(() => {
    if (prevPath.current !== pathname && !user) {
      refresh();
    }
    prevPath.current = pathname;
  }, [pathname, user, refresh]);

  return <Ctx.Provider value={{ user, loading, refresh }}>{children}</Ctx.Provider>;
}

export function useSession() {
  return useContext(Ctx);
}

export function isAdmin(u: PublicUser | null): boolean {
  return !!u && (u.role === 'admin' || u.role === 'super_admin');
}

export function isSuper(u: PublicUser | null): boolean {
  return !!u && u.role === 'super_admin';
}
