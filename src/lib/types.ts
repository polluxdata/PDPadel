export type UserRole = 'super_admin' | 'admin' | 'player';

export interface User {
  id: string;
  username: string;
  pin_hash: string;
  first_name: string;
  last_name: string;
  email: string | null;
  nickname: string | null;
  role: UserRole;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicUser = Omit<User, 'pin_hash'>;

export interface Group {
  id: string;
  name: string;
  description: string | null;
  admin_id: string | null;
  status: 'active' | 'closed';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface Season {
  id: string;
  group_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'closed';
  winner_id: string | null;
  created_by: string | null;
  created_at: string;
}

export type MatchMode = 'points' | 'sets';
export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface Quedada {
  id: string;
  season_id: string;
  name: string | null;
  quedada_date: string | null;
  duration_minutes: number;
  courts: number;
  mode: MatchMode;
  target_score: number;
  max_sets: number;
  status: 'active' | 'completed';
  created_by: string | null;
  created_at: string;
}

export interface QuedadaPlayer {
  id: string;
  quedada_id: string;
  user_id: string;
  created_at: string;
}

export interface SetDetail {
  t1: number;
  t2: number;
}

export interface Match {
  id: string;
  quedada_id: string;
  round_number: number;
  court_number: number;
  player1_id: string | null;
  player2_id: string | null;
  player3_id: string | null;
  player4_id: string | null;
  score_team1: number;
  score_team2: number;
  sets_details: SetDetail[] | null;
  status: MatchStatus;
  winner_team: 1 | 2 | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchWithUsers extends Match {
  p1?: User | null;
  p2?: User | null;
  p3?: User | null;
  p4?: User | null;
  mode?: MatchMode;
}

export interface RegistrationCode {
  id: string;
  code: string;
  kind: 'pin' | 'token';
  group_id: string | null;
  role: UserRole;
  issued_by: string | null;
  used: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: unknown | null;
  created_at: string;
}

export interface TeamUsers {
  t1: [User | null | undefined, User | null | undefined];
  t2: [User | null | undefined, User | null | undefined];
}
