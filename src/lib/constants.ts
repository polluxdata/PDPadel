export const APP_NAME = 'PDPadel';
export const DEFAULT_DURATION = 120;
export const MIN_COURTS = 1;
export const MAX_COURTS = 5;
export const DEFAULT_TARGET_SCORE = 31;
export const DEFAULT_MAX_SETS = 3;
export const PLAYERS_PER_COURT = 4;
export const SETS_OPTIONS = [1, 3, 5] as const;
export const SCORE_TARGETS = [21, 31, 50] as const;

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

export const WINNING_SETS = (maxSets: number) => Math.floor(maxSets / 2) + 1;
