import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Cliente de SERVIDOR con la llave service_role: ignora la RLS.
// Nunca importar esto desde componentes clientes.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY');
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
