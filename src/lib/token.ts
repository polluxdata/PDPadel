import { createHmac, randomInt } from 'node:crypto';

// Token diario del super admin: se regenera cada día y sirve para
// que nuevos usuarios se den de alta (rol "player").
export function dailyToken(date: Date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  const secret = process.env.APP_TOKEN_SECRET || 'pdpadel-dev-token-secret';
  return createHmac('sha256', secret).update(day).digest('hex');
}

// PIN numérico corto para invitaciones de administradores.
export function randomPin(length = 6): string {
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += randomInt(0, 10).toString();
  }
  return pin;
}
