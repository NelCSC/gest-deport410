import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AdminUser,
  AppStateSnapshot,
  CardType,
  Championship,
  Match,
  MatchCard,
  NewsComment,
  NewsPost,
  NewsReaction,
  Player,
  Team,
} from './types';
import { getInitialSeedData } from './seed-data';
import { generateId } from './tournament-utils';
import { ReactionType } from './security';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('tu-proyecto.supabase.co') &&
    !SUPABASE_ANON_KEY.includes('tu-supabase-anon-key')
);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
}

const LOCAL_STORAGE_KEY = 'gest_deport410_state_v1';
const LOCAL_ADMIN_KEY = 'gest_deport410_local_admin_v1';

export function loadLocalSnapshot(): AppStateSnapshot {
  if (typeof window === 'undefined') return getInitialSeedData();
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const seed = getInitialSeedData();
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<AppStateSnapshot>;
    const seed = getInitialSeedData();

    return {
      championships: (parsed.championships || seed.championships).map((c) => ({
        ...c,
        heroImageUrl: c.heroImageUrl || '/images/hero-hospital-stadium.jpg',
        heroImagePosition: c.heroImagePosition || '50% 50%',
      })),
      teams: parsed.teams || seed.teams,
      players: parsed.players || seed.players,
      matches: parsed.matches || seed.matches,
      newsPosts: parsed.newsPosts || seed.newsPosts,
      reactions: Array.isArray(parsed.reactions) ? parsed.reactions : seed.reactions,
      comments: Array.isArray(parsed.comments) ? parsed.comments : seed.comments,
      matchCards: Array.isArray(parsed.matchCards)
        ? parsed.matchCards
        : seed.matchCards,
    };
  } catch {
    return getInitialSeedData();
  }
}

export function saveLocalSnapshot(snapshot: AppStateSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignorar error de cuota
  }
}

export function loadLocalAdminSession(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_ADMIN_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function saveLocalAdminSession(user: AdminUser | null): void {
  if (typeof window === 'undefined') return;
  if (!user) {
    window.localStorage.removeItem(LOCAL_ADMIN_KEY);
  } else {
    window.localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(user));
  }
}

function mapChampionshipFromDb(row: Record<string, unknown>): Championship {
  return {
    id: String(row.id),
    name: String(row.name),
    sport: String(row.sport ?? 'Fulbito'),
    seasonYear: Number(row.season_year ?? 2026),
    description: String(row.description ?? ''),
    winPoints: Number(row.win_points ?? 3),
    drawPoints: Number(row.draw_points ?? 1),
    lossPoints: Number(row.loss_points ?? 0),
    liguillaQualifiers: Number(row.liguilla_qualifiers ?? 4),
    status: (row.status as Championship['status']) ?? 'activo',
    heroImageUrl: String(row.hero_image_url ?? '/images/hero-hospital-stadium.jpg'),
    heroImagePosition: String(row.hero_image_position ?? '50% 50%'),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapTeamFromDb(row: Record<string, unknown>): Team {
  return {
    id: String(row.id),
    championshipId: String(row.championship_id),
    name: String(row.name),
    serviceArea: String(row.service_area ?? ''),
    primaryColor: String(row.primary_color ?? '#10B981'),
    responsible1Name: String(row.responsible_1_name),
    responsible1Phone: String(row.responsible_1_phone ?? ''),
    responsible2Name: String(row.responsible_2_name ?? ''),
    responsible2Phone: String(row.responsible_2_phone ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapPlayerFromDb(row: Record<string, unknown>): Player {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    championshipId: String(row.championship_id),
    fullName: String(row.full_name),
    jerseyNumber: Number(row.jersey_number),
    birthDate: String(row.birth_date),
    serviceArea: String(row.service_area ?? ''),
    photoUrl: String(row.photo_url ?? ''),
    isProvisionalPhoto: Boolean(row.is_provisional_photo),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapMatchFromDb(row: Record<string, unknown>): Match {
  return {
    id: String(row.id),
    championshipId: String(row.championship_id),
    stage: row.stage as Match['stage'],
    matchday: Number(row.matchday ?? 1),
    homeTeamId: String(row.home_team_id),
    awayTeamId: String(row.away_team_id),
    homeScore:
      row.home_score === null || row.home_score === undefined
        ? null
        : Number(row.home_score),
    awayScore:
      row.away_score === null || row.away_score === undefined
        ? null
        : Number(row.away_score),
    scheduledAt: String(row.scheduled_at),
    venue: String(row.venue ?? 'Loza Deportiva U.E. 410'),
    status: row.status as Match['status'],
    notes: String(row.notes ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapNewsFromDb(row: Record<string, unknown>): NewsPost {
  return {
    id: String(row.id),
    championshipId: String(row.championship_id),
    commentary: String(row.commentary),
    imageUrl: String(row.image_url ?? ''),
    authorName: String(row.author_name ?? 'Comisión de Deportes U.E. 410'),
    publishedAt: String(row.published_at ?? new Date().toISOString()),
  };
}

function mapReactionFromDb(row: Record<string, unknown>): NewsReaction {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    visitorId: String(row.visitor_id),
    reactionType: row.reaction_type as ReactionType,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapCommentFromDb(row: Record<string, unknown>): NewsComment {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    visitorId: String(row.visitor_id),
    authorAlias: String(row.author_alias ?? 'Visitante Anónimo'),
    content: String(row.content ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapMatchCardFromDb(row: Record<string, unknown>): MatchCard {
  return {
    id: String(row.id),
    championshipId: String(row.championship_id),
    matchId: String(row.match_id),
    teamId: String(row.team_id),
    playerId: String(row.player_id),
    cardType: (row.card_type as CardType) || 'amarilla',
    penaltyRegularized: Boolean(row.penalty_regularized),
    notes: String(row.notes ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function fetchAllDataFromSupabase(): Promise<AppStateSnapshot | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const [
    champRes,
    teamsRes,
    playersRes,
    matchesRes,
    newsRes,
    reactionsRes,
    commentsRes,
    cardsRes,
  ] = await Promise.all([
    client.from('championships').select('*').order('created_at', { ascending: false }),
    client.from('teams').select('*').order('created_at', { ascending: true }),
    client.from('players').select('*').order('jersey_number', { ascending: true }),
    client.from('matches').select('*').order('scheduled_at', { ascending: true }),
    client.from('news_posts').select('*').order('published_at', { ascending: false }),
    client.from('reactions').select('*'),
    client.from('comments').select('*').order('created_at', { ascending: true }),
    client.from('match_cards').select('*').order('created_at', { ascending: false }),
  ]);

  if (champRes.error || teamsRes.error || playersRes.error || matchesRes.error || newsRes.error) {
    throw new Error(
      champRes.error?.message ||
        teamsRes.error?.message ||
        playersRes.error?.message ||
        matchesRes.error?.message ||
        newsRes.error?.message ||
        'Error al consultar Supabase'
    );
  }

  return {
    championships: (champRes.data || []).map(mapChampionshipFromDb),
    teams: (teamsRes.data || []).map(mapTeamFromDb),
    players: (playersRes.data || []).map(mapPlayerFromDb),
    matches: (matchesRes.data || []).map(mapMatchFromDb),
    newsPosts: (newsRes.data || []).map(mapNewsFromDb),
    reactions: reactionsRes.error ? [] : (reactionsRes.data || []).map(mapReactionFromDb),
    comments: commentsRes.error ? [] : (commentsRes.data || []).map(mapCommentFromDb),
    matchCards: cardsRes.error ? [] : (cardsRes.data || []).map(mapMatchCardFromDb),
  };
}

export async function dbCreateChampionship(
  input: Omit<Championship, 'id' | 'createdAt'>
): Promise<Championship> {
  const client = getSupabaseClient();
  if (!client) {
    return { ...input, id: generateId('champ'), createdAt: new Date().toISOString() };
  }
  const { data, error } = await client
    .from('championships')
    .insert({
      name: input.name,
      sport: input.sport,
      season_year: input.seasonYear,
      description: input.description,
      win_points: input.winPoints,
      draw_points: input.drawPoints,
      loss_points: input.lossPoints,
      liguilla_qualifiers: input.liguillaQualifiers,
      status: input.status,
      hero_image_url: input.heroImageUrl,
      hero_image_position: input.heroImagePosition,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapChampionshipFromDb(data);
}

export async function dbUpdateChampionship(champ: Championship): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('championships')
    .update({
      name: champ.name,
      sport: champ.sport,
      season_year: champ.seasonYear,
      description: champ.description,
      win_points: champ.winPoints,
      draw_points: champ.drawPoints,
      loss_points: champ.lossPoints,
      liguilla_qualifiers: champ.liguillaQualifiers,
      status: champ.status,
      hero_image_url: champ.heroImageUrl,
      hero_image_position: champ.heroImagePosition,
    })
    .eq('id', champ.id);
  if (error) throw new Error(error.message);
}

export async function dbDeleteChampionship(championshipId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('championships')
    .delete()
    .eq('id', championshipId);
  if (error) throw new Error(error.message);
}

export async function dbCreateTeam(input: Omit<Team, 'id' | 'createdAt'>): Promise<Team> {
  const client = getSupabaseClient();
  if (!client) {
    return { ...input, id: generateId('team'), createdAt: new Date().toISOString() };
  }
  const { data, error } = await client
    .from('teams')
    .insert({
      championship_id: input.championshipId,
      name: input.name,
      service_area: input.serviceArea,
      primary_color: input.primaryColor,
      responsible_1_name: input.responsible1Name,
      responsible_1_phone: input.responsible1Phone,
      responsible_2_name: input.responsible2Name,
      responsible_2_phone: input.responsible2Phone,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapTeamFromDb(data);
}

export async function dbUpdateTeam(team: Team): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('teams')
    .update({
      name: team.name,
      service_area: team.serviceArea,
      primary_color: team.primaryColor,
      responsible_1_name: team.responsible1Name,
      responsible_1_phone: team.responsible1Phone,
      responsible_2_name: team.responsible2Name,
      responsible_2_phone: team.responsible2Phone,
    })
    .eq('id', team.id);
  if (error) throw new Error(error.message);
}

export async function dbDeleteTeam(teamId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('teams').delete().eq('id', teamId);
  if (error) throw new Error(error.message);
}

export async function dbCreatePlayer(input: Omit<Player, 'id' | 'createdAt'>): Promise<Player> {
  const client = getSupabaseClient();
  if (!client) {
    return { ...input, id: generateId('pl'), createdAt: new Date().toISOString() };
  }
  const { data, error } = await client
    .from('players')
    .insert({
      team_id: input.teamId,
      championship_id: input.championshipId,
      full_name: input.fullName,
      jersey_number: input.jerseyNumber,
      birth_date: input.birthDate,
      service_area: input.serviceArea,
      photo_url: input.photoUrl,
      is_provisional_photo: input.isProvisionalPhoto,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapPlayerFromDb(data);
}

export async function dbUpdatePlayer(player: Player): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('players')
    .update({
      full_name: player.fullName,
      jersey_number: player.jerseyNumber,
      birth_date: player.birthDate,
      service_area: player.serviceArea,
      photo_url: player.photoUrl,
      is_provisional_photo: player.isProvisionalPhoto,
    })
    .eq('id', player.id);
  if (error) throw new Error(error.message);
}

export async function dbDeletePlayer(playerId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('players').delete().eq('id', playerId);
  if (error) throw new Error(error.message);
}

export async function dbCreateMatches(
  inputs: Omit<Match, 'id' | 'createdAt'>[]
): Promise<Match[]> {
  const client = getSupabaseClient();
  if (!client) {
    const now = new Date().toISOString();
    return inputs.map((m) => ({ ...m, id: generateId('match'), createdAt: now }));
  }
  const payload = inputs.map((m) => ({
    championship_id: m.championshipId,
    stage: m.stage,
    matchday: m.matchday,
    home_team_id: m.homeTeamId,
    away_team_id: m.awayTeamId,
    home_score: m.homeScore,
    away_score: m.awayScore,
    scheduled_at: m.scheduledAt,
    venue: m.venue,
    status: m.status,
    notes: m.notes,
  }));
  const { data, error } = await client.from('matches').insert(payload).select();
  if (error) throw new Error(error.message);
  return (data || []).map(mapMatchFromDb);
}

export async function dbUpdateMatch(match: Match): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('matches')
    .update({
      stage: match.stage,
      matchday: match.matchday,
      home_team_id: match.homeTeamId,
      away_team_id: match.awayTeamId,
      home_score: match.homeScore,
      away_score: match.awayScore,
      scheduled_at: match.scheduledAt,
      venue: match.venue,
      status: match.status,
      notes: match.notes,
    })
    .eq('id', match.id);
  if (error) throw new Error(error.message);
}

export async function dbDeleteMatch(matchId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('matches').delete().eq('id', matchId);
  if (error) throw new Error(error.message);
}

export async function dbCreateMatchCard(
  input: Omit<MatchCard, 'id' | 'createdAt'>
): Promise<MatchCard> {
  const client = getSupabaseClient();
  if (!client) {
    return { ...input, id: generateId('card'), createdAt: new Date().toISOString() };
  }
  const { data, error } = await client
    .from('match_cards')
    .insert({
      championship_id: input.championshipId,
      match_id: input.matchId,
      team_id: input.teamId,
      player_id: input.playerId,
      card_type: input.cardType,
      penalty_regularized: input.penaltyRegularized,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapMatchCardFromDb(data);
}

export async function dbUpdateMatchCard(card: MatchCard): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('match_cards')
    .update({
      card_type: card.cardType,
      penalty_regularized: card.penaltyRegularized,
      notes: card.notes,
    })
    .eq('id', card.id);
  if (error) throw new Error(error.message);
}

export async function dbDeleteMatchCard(cardId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('match_cards').delete().eq('id', cardId);
  if (error) throw new Error(error.message);
}

export async function dbCreateNewsPost(
  input: Omit<NewsPost, 'id'>
): Promise<NewsPost> {
  const client = getSupabaseClient();
  if (!client) {
    return { ...input, id: generateId('news') };
  }
  const { data, error } = await client
    .from('news_posts')
    .insert({
      championship_id: input.championshipId,
      commentary: input.commentary,
      image_url: input.imageUrl,
      author_name: input.authorName,
      published_at: input.publishedAt,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapNewsFromDb(data);
}

export async function dbDeleteNewsPost(postId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('news_posts').delete().eq('id', postId);
  if (error) throw new Error(error.message);
}
