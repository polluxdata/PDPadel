import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuditInput {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
}

// Trazabilidad: registra quién hizo cada cambio.
export async function audit(
  supabase: SupabaseClient,
  input: AuditInput
): Promise<void> {
  await supabase.from('audit_log').insert({
    user_id: input.userId,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId ?? null,
    details: input.details ?? null,
  });
}
