import type { SupabaseClient } from '@supabase/supabase-js';

// Límite por ventana fija (key, window). Devuelve true si está dentro del límite.
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString();

  // Limpieza básica de ventanas viejas.
  await supabase.from('rate_limits').delete().lt('window_start', new Date(now - windowMs).toISOString());

  const { data } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('key', key)
    .eq('window_start', windowStart)
    .maybeSingle();

  const count = ((data as { count?: number } | null)?.count ?? 0) + 1;
  if (count > limit) return false;

  const { error } = await supabase.from('rate_limits').upsert(
    { key, window_start: windowStart, count },
    { onConflict: 'key,window_start' }
  );
  return !error;
}
