import { Championship, Match, MatchStage, StandingRow, Team } from './types';

export const STAGE_LABELS: Record<MatchStage, string> = {
  todos_contra_todos: 'Todos contra Todos',
  liguilla: 'Liguilla',
  semifinal: 'Semifinal',
  tercer_puesto: 'Tercer Puesto',
  final: 'Gran Final',
};

export const STATUS_LABELS = {
  programado: 'Programado',
  en_juego: 'En Juego',
  finalizado: 'Finalizado',
} as const;

export const HOSPITAL_SERVICE_AREAS = [
  'Emergencia y Trauma Shock',
  'Cirugía y Centro Quirúrgico',
  'Pediatría y Neonatología',
  'Medicina Interna',
  'Gineco-Obstetricia',
  'Laboratorio Clínico y Banco de Sangre',
  'Diagnóstico por Imágenes',
  'Farmacia y Logística',
  'Administración y Estadística',
  'Enfermería y Consultorios Externos',
  'Mantenimiento y Servicios Generales',
  'UCI / Cuidados Intermedios',
];

export const TEAM_PALETTE_OPTIONS = [
  { label: 'Verde Teal Institucional', hex: '#0D5C63' },
  { label: 'Esmeralda Quillabamba', hex: '#059669' },
  { label: 'Azul Clínico', hex: '#1D4ED8' },
  { label: 'Carmesí Emergencia', hex: '#B91C1C' },
  { label: 'Ámbar Dorado', hex: '#B45309' },
  { label: 'Pizarra Oscura', hex: '#334155' },
  { label: 'Índigo Quirúrgico', hex: '#4338CA' },
  { label: 'Cian Diagnóstico', hex: '#0E7490' },
];

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Calcula la edad exacta en años a partir de una fecha YYYY-MM-DD.
 */
export function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const parts = birthDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [year, month, day] = parts;
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }
  return age;
}

export function validateBirthDate(birthDate: string): string | null {
  if (!birthDate) return 'Ingresa la fecha de nacimiento del jugador.';
  const age = calculateAge(birthDate);
  if (age === null) return 'El formato de fecha no es válido.';
  if (age < 16) return 'La edad mínima recomendada para participar es 16 años.';
  if (age > 75) return 'Verifica el año de nacimiento (edad calculada superior a 75 años).';
  return null;
}

/**
 * Genera una foto provisional SVG limpia con iniciales y dorsal del jugador.
 */
export function createProvisionalAvatarUrl(
  fullName: string,
  jerseyNumber: number,
  bgColor = '#0D5C63'
): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : (words[0]?.slice(0, 2) || 'GD').toUpperCase();

  const safeColor = /^#[0-9A-Fa-f]{6}$/.test(bgColor) ? bgColor : '#0D5C63';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <rect width="240" height="240" fill="${safeColor}"/>
    <rect width="240" height="240" fill="url(#g)" opacity="0.28"/>
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#000000"/>
      </linearGradient>
    </defs>
    <text x="120" y="114" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="68" font-weight="700" fill="#ffffff" letter-spacing="2">${initials}</text>
    <rect x="76" y="144" width="88" height="32" rx="6" fill="rgba(255,255,255,0.18)"/>
    <text x="120" y="166" text-anchor="middle" font-family="monospace" font-size="18" font-weight="700" fill="#ffffff">#${jerseyNumber}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Calcula la Tabla de Posiciones en tiempo real según las reglas configurables del campeonato.
 */
export function computeStandings(
  teams: Team[],
  matches: Match[],
  championship: Championship,
  stageFilter: 'todos_contra_todos' | 'todas' = 'todos_contra_todos'
): StandingRow[] {
  const statsMap = new Map<
    string,
    {
      team: Team;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      points: number;
      resultsHistory: { date: string; res: 'G' | 'E' | 'P' }[];
    }
  >();

  for (const team of teams) {
    statsMap.set(team.id, {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      resultsHistory: [],
    });
  }

  const relevantMatches = matches
    .filter((m) => {
      if (m.status !== 'finalizado') return false;
      if (m.homeScore === null || m.awayScore === null) return false;
      if (stageFilter === 'todos_contra_todos' && m.stage !== 'todos_contra_todos') {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  for (const match of relevantMatches) {
    const home = statsMap.get(match.homeTeamId);
    const away = statsMap.get(match.awayTeamId);
    if (!home || !away) continue;

    const hs = match.homeScore ?? 0;
    const as = match.awayScore ?? 0;

    home.played += 1;
    away.played += 1;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;

    if (hs > as) {
      home.won += 1;
      home.points += championship.winPoints;
      home.resultsHistory.push({ date: match.scheduledAt, res: 'G' });

      away.lost += 1;
      away.points += championship.lossPoints;
      away.resultsHistory.push({ date: match.scheduledAt, res: 'P' });
    } else if (hs < as) {
      away.won += 1;
      away.points += championship.winPoints;
      away.resultsHistory.push({ date: match.scheduledAt, res: 'G' });

      home.lost += 1;
      home.points += championship.lossPoints;
      home.resultsHistory.push({ date: match.scheduledAt, res: 'P' });
    } else {
      home.drawn += 1;
      home.points += championship.drawPoints;
      home.resultsHistory.push({ date: match.scheduledAt, res: 'E' });

      away.drawn += 1;
      away.points += championship.drawPoints;
      away.resultsHistory.push({ date: match.scheduledAt, res: 'E' });
    }
  }

  const rows: StandingRow[] = Array.from(statsMap.values()).map((entry) => ({
    position: 0,
    team: entry.team,
    played: entry.played,
    won: entry.won,
    drawn: entry.drawn,
    lost: entry.lost,
    goalsFor: entry.goalsFor,
    goalsAgainst: entry.goalsAgainst,
    goalDifference: entry.goalsFor - entry.goalsAgainst,
    points: entry.points,
    recentForm: entry.resultsHistory.slice(-5).map((r) => r.res),
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (b.won !== a.won) return b.won - a.won;
    return a.team.name.localeCompare(b.team.name, 'es');
  });

  return rows.map((row, idx) => ({
    ...row,
    position: idx + 1,
  }));
}

/**
 * Genera el fixture Todos contra Todos usando el algoritmo Berger.
 */
export function generateRoundRobinFixtures(
  championshipId: string,
  teams: Team[],
  startDateIso: string,
  venue: string
): Omit<Match, 'id' | 'createdAt'>[] {
  if (teams.length < 2) return [];

  const list: (Team | null)[] = [...teams];
  if (list.length % 2 !== 0) {
    list.push(null); // Descansa
  }

  const n = list.length;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;
  const baseDate = new Date(startDateIso);
  const generated: Omit<Match, 'id' | 'createdAt'>[] = [];

  for (let round = 0; round < totalRounds; round++) {
    const roundDate = new Date(baseDate.getTime());
    roundDate.setDate(roundDate.getDate() + round * 7);

    for (let i = 0; i < matchesPerRound; i++) {
      const home = list[i];
      const away = list[n - 1 - i];

      if (home && away) {
        const matchTime = new Date(roundDate.getTime());
        matchTime.setHours(15 + i, (i % 2) * 30, 0, 0);

        const swap = round % 2 === 1 && i === 0;
        generated.push({
          championshipId,
          stage: 'todos_contra_todos',
          matchday: round + 1,
          homeTeamId: swap ? away.id : home.id,
          awayTeamId: swap ? home.id : away.id,
          homeScore: null,
          awayScore: null,
          scheduledAt: matchTime.toISOString(),
          venue: venue || 'Loza Deportiva U.E. 410',
          status: 'programado',
          notes: `Jornada ${round + 1} · Fase Todos contra Todos`,
        });
      }
    }

    // Rotación Berger manteniendo el índice 0 fijo
    const last = list.pop()!;
    list.splice(1, 0, last);
  }

  return generated;
}

/**
 * Genera llaves eliminatorias (Liguilla, Semifinales o Final) a partir de la tabla o fase previa.
 */
export function generateStageFixturesFromStandings(
  championshipId: string,
  targetStage: 'liguilla' | 'semifinal' | 'final',
  standings: StandingRow[],
  existingMatches: Match[],
  qualifiersCount: number,
  startDateIso: string,
  venue: string
): { matches: Omit<Match, 'id' | 'createdAt'>[]; error?: string } {
  const baseDate = new Date(startDateIso);
  const out: Omit<Match, 'id' | 'createdAt'>[] = [];

  if (targetStage === 'liguilla') {
    if (standings.length < qualifiersCount || qualifiersCount < 2) {
      return {
        matches: [],
        error: `Se necesitan al menos ${qualifiersCount} equipos inscritos para armar la Liguilla.`,
      };
    }
    const qualified = standings.slice(0, qualifiersCount);
    const pairCount = Math.floor(qualified.length / 2);

    for (let i = 0; i < pairCount; i++) {
      const top = qualified[i];
      const bottom = qualified[qualified.length - 1 - i];
      const dt = new Date(baseDate.getTime());
      dt.setHours(15 + i, 0, 0, 0);

      out.push({
        championshipId,
        stage: 'liguilla',
        matchday: 1,
        homeTeamId: top.team.id,
        awayTeamId: bottom.team.id,
        homeScore: null,
        awayScore: null,
        scheduledAt: dt.toISOString(),
        venue,
        status: 'programado',
        notes: `Liguilla · ${top.position}° vs ${bottom.position}° de la tabla`,
      });
    }
    return { matches: out };
  }

  if (targetStage === 'semifinal') {
    const liguillaFinished = existingMatches.filter(
      (m) => m.stage === 'liguilla' && m.status === 'finalizado' && m.homeScore !== null && m.awayScore !== null
    );

    let semifinalists: Team[] = [];
    if (liguillaFinished.length >= 2) {
      semifinalists = liguillaFinished
        .map((m) => {
          const winnerId = (m.homeScore ?? 0) >= (m.awayScore ?? 0) ? m.homeTeamId : m.awayTeamId;
          return standings.find((s) => s.team.id === winnerId)?.team;
        })
        .filter((t): t is Team => Boolean(t));
    }

    if (semifinalists.length < 4) {
      if (standings.length < 4) {
        return {
          matches: [],
          error: 'Se necesitan al menos 4 equipos en la tabla para generar Semifinales.',
        };
      }
      semifinalists = standings.slice(0, 4).map((s) => s.team);
    }

    const pairs: [Team, Team, string][] = [
      [semifinalists[0], semifinalists[3], 'Semifinal 1 (1° vs 4°)'],
      [semifinalists[1], semifinalists[2], 'Semifinal 2 (2° vs 3°)'],
    ];

    pairs.forEach(([home, away, label], idx) => {
      const dt = new Date(baseDate.getTime());
      dt.setHours(15 + idx * 2, 0, 0, 0);
      out.push({
        championshipId,
        stage: 'semifinal',
        matchday: 1,
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore: null,
        awayScore: null,
        scheduledAt: dt.toISOString(),
        venue,
        status: 'programado',
        notes: label,
      });
    });

    return { matches: out };
  }

  // Final + Tercer Puesto
  const semisFinished = existingMatches.filter(
    (m) => m.stage === 'semifinal' && m.status === 'finalizado' && m.homeScore !== null && m.awayScore !== null
  );

  if (semisFinished.length >= 2) {
    const winners: string[] = [];
    const losers: string[] = [];
    for (const semi of semisFinished.slice(0, 2)) {
      const hs = semi.homeScore ?? 0;
      const as = semi.awayScore ?? 0;
      if (hs >= as) {
        winners.push(semi.homeTeamId);
        losers.push(semi.awayTeamId);
      } else {
        winners.push(semi.awayTeamId);
        losers.push(semi.homeTeamId);
      }
    }

    const thirdTime = new Date(baseDate.getTime());
    thirdTime.setHours(15, 0, 0, 0);
    const finalTime = new Date(baseDate.getTime());
    finalTime.setHours(17, 0, 0, 0);

    out.push({
      championshipId,
      stage: 'tercer_puesto',
      matchday: 1,
      homeTeamId: losers[0],
      awayTeamId: losers[1],
      homeScore: null,
      awayScore: null,
      scheduledAt: thirdTime.toISOString(),
      venue,
      status: 'programado',
      notes: 'Definición de Tercer Puesto',
    });

    out.push({
      championshipId,
      stage: 'final',
      matchday: 1,
      homeTeamId: winners[0],
      awayTeamId: winners[1],
      homeScore: null,
      awayScore: null,
      scheduledAt: finalTime.toISOString(),
      venue,
      status: 'programado',
      notes: 'Gran Final de Aniversario U.E. 410',
    });

    return { matches: out };
  }

  if (standings.length < 2) {
    return { matches: [], error: 'Se requieren al menos 2 equipos para programar la Gran Final.' };
  }

  const finalTime = new Date(baseDate.getTime());
  finalTime.setHours(17, 0, 0, 0);
  out.push({
    championshipId,
    stage: 'final',
    matchday: 1,
    homeTeamId: standings[0].team.id,
    awayTeamId: standings[1].team.id,
    homeScore: null,
    awayScore: null,
    scheduledAt: finalTime.toISOString(),
    venue,
    status: 'programado',
    notes: 'Gran Final (1° vs 2° de la tabla)',
  });

  return { matches: out };
}

export function formatMatchDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return 'Fecha por definir';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatMatchTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatNewsTimestamp(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
