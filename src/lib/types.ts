export interface Player {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface Season {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  season_id: string | null;
  name: string | null;
  event_date: string | null;
  duration_minutes: number;
  courts: number;
  status: 'active' | 'completed';
  created_at: string;
}

export interface EventPlayer {
  id: string;
  event_id: string;
  player_id: string;
  created_at: string;
}

export type MatchMode = 'points' | 'sets';
export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface SetDetail {
  t1: number;
  t2: number;
}

export interface Match {
  id: string;
  event_id: string;
  round_number: number;
  court_number: number;
  player1_id: string | null;
  player2_id: string | null;
  player3_id: string | null;
  player4_id: string | null;
  mode: MatchMode;
  target_score: number;
  max_sets: number;
  score_team1: number;
  score_team2: number;
  sets_details: SetDetail[] | null;
  status: MatchStatus;
  winner_team: 1 | 2 | null;
  created_at: string;
}

export interface MatchWithPlayers extends Match {
  p1?: Player | null;
  p2?: Player | null;
  p3?: Player | null;
  p4?: Player | null;
}

export interface TeamPlayers {
  teamA: [Player | null, Player | null];
  teamB: [Player | null, Player | null];
}
