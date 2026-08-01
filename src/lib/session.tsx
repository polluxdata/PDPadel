'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

  async function refresh() {
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
  }

  useEffect(() => {
    refresh();
  }, []);

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
