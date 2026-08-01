import type { Group, User } from './types';

// Roles por grupo: el creador (admin_id) y quienes tienen rol 'admin' en la
// membresía son administradores de ESE grupo. Solo el super admin es global.
export function isGroupAdmin(
  user: User | { role: string; id: string } | null,
  group: Pick<Group, 'admin_id'> | null,
  membershipRole?: string | null
): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (group?.admin_id === user.id) return true;
  return membershipRole === 'admin';
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomGroupCode(length = 6): string {
  let code = '';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}
