import { createServiceClient } from '@/lib/supabase/service';

// Crea el usuario 0 (super admin) si no existe. Idempotente.
export async function POST() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'super_admin')
    .limit(1);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
    });
  }

  if (data && data.length > 0) {
    return Response.json({ ok: true, created: false });
  }

  const bcrypt = await import('bcryptjs');
  const pin = process.env.SUPER_ADMIN_PIN || '0000';
  const pin_hash = await bcrypt.hash(pin, 10);

  const { data: created, error: insertError } = await supabase
    .from('users')
    .insert({
      username: 'superadmin',
      pin_hash,
      first_name: 'Super',
      last_name: 'Admin',
      email: process.env.SUPER_ADMIN_EMAIL || null,
      role: 'super_admin',
    })
    .select('id, username')
    .single();

  if (insertError) {
    return new Response(JSON.stringify({ ok: false, error: insertError.message }), {
      status: 500,
    });
  }

  await supabase.from('audit_log').insert({
    user_id: created.id,
    action: 'bootstrap',
    entity: 'user',
    entity_id: created.id,
    details: { username: created.username, role: 'super_admin' },
  });

  return Response.json({ ok: true, created: true, username: 'superadmin' });
}
