import { ReactionType } from './security';

export type MatchStage =
  | 'todos_contra_todos'
  | 'liguilla'
  | 'semifinal'
  | 'tercer_puesto'
  | 'final';

export type MatchStatus = 'programado' | 'en_juego' | 'finalizado';

export type ChampionshipStatus = 'activo' | 'finalizado';

export type AppPage =
  | 'inicio'
  | 'programacion'
  | 'equipos'
  | 'posiciones'
  | 'goleadores';

export interface Championship {
  id: string;
  name: string;
  sport: string;
  seasonYear: number;
  description: string;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  liguillaQualifiers: number;
  status: ChampionshipStatus;
  heroImageUrl: string;
  heroImagePosition: string; // CSS object-position e.g. "50% 45%"
  createdAt: string;
}

export interface Team {
  id: string;
  championshipId: string;
  name: string;
  serviceArea: string;
  primaryColor: string;
  responsible1Name: string;
  responsible1Phone: string;
  responsible2Name: string;
  responsible2Phone: string;
  createdAt: string;
}

export interface Player {
  id: string;
  teamId: string;
  championshipId: string;
  fullName: string;
  jerseyNumber: number;
  birthDate: string; // YYYY-MM-DD
  serviceArea: string;
  photoUrl: string;
  isProvisionalPhoto: boolean;
  createdAt: string;
}

export interface Match {
  id: string;
  championshipId: string;
  stage: MatchStage;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  scheduledAt: string; // ISO string
  venue: string;
  status: MatchStatus;
  notes: string;
  createdAt: string;
}

export interface NewsPost {
  id: string;
  championshipId: string;
  commentary: string;
  imageUrl: string;
  authorName: string;
  publishedAt: string; // ISO string
}

export interface NewsReaction {
  id: string;
  postId: string;
  visitorId: string;
  reactionType: ReactionType;
  createdAt: string;
}

export type CardType = 'amarilla' | 'roja';

export interface MatchCard {
  id: string;
  championshipId: string;
  matchId: string;
  teamId: string;
  playerId: string;
  cardType: CardType;
  penaltyRegularized: boolean;
  notes: string;
  createdAt: string;
}

export interface MatchGoal {
  id: string;
  championshipId: string;
  matchId: string;
  teamId: string;
  playerId: string;
  goalsCount: number;
  createdAt: string;
}

export interface NewsComment {
  id: string;
  postId: string;
  visitorId: string;
  authorAlias: string;
  content: string;
  createdAt: string;
}

export interface StandingRow {
  position: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  recentForm: ('G' | 'E' | 'P')[];
}

export interface TopScorerRow {
  rank: number;
  player: Player;
  team: Team;
  goals: number;
  matchesWithGoals: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  mode: 'supabase' | 'local';
}

export interface AppStateSnapshot {
  championships: Championship[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  newsPosts: NewsPost[];
  reactions: NewsReaction[];
  comments: NewsComment[];
  matchCards: MatchCard[];
  matchGoals: MatchGoal[];
}
