'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const MISSING_ENV_ERROR = {
  message:
    'Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local',
};

// Used only at build time (prerendering) and when env vars are missing.
// Any query resolves to `{ data: null, error }` so pages render their
// empty/loading states instead of crashing.
function createStub(): SupabaseClient {
  const chain = (): SupabaseClient =>
    new Proxy(function () {} as unknown as SupabaseClient, {
      get(_t, prop: string | symbol) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) =>
            Promise.resolve({ data: null, error: MISSING_ENV_ERROR }).then(resolve);
        }
        return chain();
      },
      apply() {
        return chain();
      },
    });
  return chain();
}

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return createStub();
  return createBrowserClient(url, key);
}
