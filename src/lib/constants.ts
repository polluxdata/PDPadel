export const APP_NAME = 'PolluxPadel';

export const MIN_COURTS = 1;
export const MAX_COURTS = 5;
export const PLAYERS_PER_COURT = 4;
export const DEFAULT_DURATION = 120;
export const DEFAULT_TARGET_SCORE = 31;
export const SCORE_TARGETS = [21, 31, 50] as const;

export const WIN_POINTS = 2;
export const SETS_WIN_POINTS = 1;
export const MAX_SETS_PER_ROUND = 12;

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  player: 'Jugador',
};

export const MODE_LABELS: Record<string, string> = {
  points: 'Puntos',
  sets: 'Sets',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En juego',
  completed: 'Jugado',
  skipped: 'Saltado',
};
