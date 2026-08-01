import { randomBytes } from 'node:crypto';

export function magicToken(): string {
  return randomBytes(32).toString('hex');
}

export function confirmUrl(token: string): string {
  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/auth/confirm?token=${token}`;
}

export function inviteUrl(token: string): string {
  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/auth/invite?token=${token}`;
}

export function appUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}
