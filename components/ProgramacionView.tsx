'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Edit3,
  GitBranch,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  STAGE_LABELS,
  STATUS_LABELS,
  formatMatchDate,
  formatMatchTime,
  generateRoundRobinFixtures,
  generateStageFixturesFromStandings,
} from '@/lib/tournament-utils';
import {
  AdminUser,
  CardType,
  Championship,
  Match,
  MatchCard,
  MatchGoal,
  MatchStage,
  MatchStatus,
  Player,
  StandingRow,
  Team,
} from '@/lib/types';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';

interface ProgramacionViewProps {
  championship: Championship;
  teams: Team[];
  players: Player[];
  matches: Match[];
  matchCards: MatchCard[];
  matchGoals: MatchGoal[];
  standings: StandingRow[];
  adminUser: AdminUser | null;
  onCreateMatches: (inputs: Omit<Match, 'id' | 'createdAt'>[]) => Promise<void>;
  onUpdateMatch: (match: Match) => Promise<void>;
  onDeleteMatch: (matchId: string) => Promise<void>;
  onCreateMatchCard: (input: Omit<MatchCard, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateMatchCard: (card: MatchCard) => Promise<void>;
  onDeleteMatchCard: (cardId: string) => Promise<void>;
  onSyncMatchGoals: (
    matchId: string,
    goals: { teamId: string; playerId: string; goalsCount: number }[]
  ) => Promise<void>;
}

const STAGE_TABS: { id: 'todos' | MatchStage; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'todos_contra_todos', label: 'Todos contra Todos' },
  { id: 'liguilla', label: 'Liguilla' },
  { id: 'semifinal', label: 'Semifinales' },
  { id: 'final', label: 'Finales' },
];

export default function ProgramacionView({
  championship,
  teams,
  players,
  matches,
  matchCards,
  matchGoals,
  standings,
  adminUser,
  onCreateMatches,
  onUpdateMatch,
  onDeleteMatch,
  onCreateMatchCard,
  onUpdateMatchCard,
  onDeleteMatchCard,
  onSyncMatchGoals,
}: ProgramacionViewProps) {
  const [stageFilter, setStageFilter] = useState<'todos' | MatchStage>('todos');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoundRobinModal, setShowRoundRobinModal] = useState(false);
  const [showKnockoutModal, setShowKnockoutModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  useLockBodyScroll(
    Boolean(showCreateModal || showRoundRobinModal || showKnockoutModal || editingMatch)
  );

  // Create Match form
  const [homeId, setHomeId] = useState('');
  const [awayId, setAwayId] = useState('');
  const [stage, setStage] = useState<MatchStage>('todos_contra_todos');
  const [matchday, setMatchday] = useState(1);
  const [dateTimeLocal, setDateTimeLocal] = useState('2026-11-21T15:30');
  const [venue, setVenue] = useState('Loza Deportiva U.E. 410');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Round-robin generator form
  const [rrStartDate, setRrStartDate] = useState('2026-11-22');
  const [rrVenue, setRrVenue] = useState('Loza Deportiva U.E. 410');

  // Knockout generator form
  const [koTargetStage, setKoTargetStage] = useState<'liguilla' | 'semifinal' | 'final'>('liguilla');
  const [koQualifiers, setKoQualifiers] = useState(championship.liguillaQualifiers || 4);
  const [koStartDate, setKoStartDate] = useState('2026-11-28');
  const [koVenue, setKoVenue] = useState('Campo Sintético Quillabamba');
  const [koError, setKoError] = useState<string | null>(null);

  // Score / Edit Match modal
  const [editHomeScore, setEditHomeScore] = useState<string>('');
  const [editAwayScore, setEditAwayScore] = useState<string>('');
  const [editStatus, setEditStatus] = useState<MatchStatus>('programado');
  const [editDateTime, setEditDateTime] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Form amonestaciones dentro del modal de resultado
  const [cardTeamId, setCardTeamId] = useState('');
  const [cardPlayerId, setCardPlayerId] = useState('');
  const [cardType, setCardType] = useState<CardType>('amarilla');
  const [cardRegularized, setCardRegularized] = useState(false);
  const [cardNotes, setCardNotes] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);
  const [savingCard, setSavingCard] = useState(false);

  // Form goleadores dentro del modal de resultado
  const [draftGoals, setDraftGoals] = useState<
    { teamId: string; playerId: string; goalsCount: number }[]
  >([]);
  const [goalTeamId, setGoalTeamId] = useState('');
  const [goalPlayerId, setGoalPlayerId] = useState('');
  const [goalCountInput, setGoalCountInput] = useState('1');
  const [goalError, setGoalError] = useState<string | null>(null);

  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const filteredMatches = matches
    .filter((m) => {
      if (stageFilter === 'todos') return true;
      if (stageFilter === 'final') {
        return m.stage === 'final' || m.stage === 'tercer_puesto';
      }
      return m.stage === stageFilter;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // Agrupar por Etapa + Jornada
  const groupedMatches = filteredMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const key =
      m.stage === 'todos_contra_todos'
        ? `Todos contra Todos · Jornada ${m.matchday}`
        : STAGE_LABELS[m.stage];
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const openCreateModal = () => {
    setFormError(null);
    setHomeId(teams[0]?.id || '');
    setAwayId(teams[1]?.id || '');
    setShowCreateModal(true);
  };

  const handleCreateSingleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!homeId || !awayId) {
      setFormError('Selecciona ambos equipos para programar el encuentro.');
      return;
    }
    if (homeId === awayId) {
      setFormError('El equipo local y el visitante deben ser diferentes.');
      return;
    }
    if (!dateTimeLocal) {
      setFormError('Indica la fecha y hora del encuentro.');
      return;
    }

    setSaving(true);
    try {
      await onCreateMatches([
        {
          championshipId: championship.id,
          stage,
          matchday,
          homeTeamId: homeId,
          awayTeamId: awayId,
          homeScore: null,
          awayScore: null,
          scheduledAt: new Date(dateTimeLocal).toISOString(),
          venue: venue.trim() || 'Loza Deportiva U.E. 410',
          status: 'programado',
          notes: notes.trim(),
        },
      ]);
      setShowCreateModal(false);
      setNotes('');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Error al registrar el partido.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateRoundRobin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teams.length < 2) return;
    setSaving(true);
    try {
      const fixtures = generateRoundRobinFixtures(
        championship.id,
        teams,
        `${rrStartDate}T15:00:00`,
        rrVenue.trim() || 'Loza Deportiva U.E. 410'
      );
      await onCreateMatches(fixtures);
      setShowRoundRobinModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateKnockout = async (e: React.FormEvent) => {
    e.preventDefault();
    setKoError(null);
    const res = generateStageFixturesFromStandings(
      championship.id,
      koTargetStage,
      standings,
      matches,
      koQualifiers,
      `${koStartDate}T15:00:00`,
      koVenue.trim() || 'Campo Sintético Quillabamba'
    );
    if (res.error) {
      setKoError(res.error);
      return;
    }
    setSaving(true);
    try {
      await onCreateMatches(res.matches);
      setShowKnockoutModal(false);
      setStageFilter(koTargetStage);
    } finally {
      setSaving(false);
    }
  };

  const openEditMatchModal = (match: Match) => {
    setEditingMatch(match);
    setEditError(null);
    setEditHomeScore(match.homeScore !== null ? String(match.homeScore) : '0');
    setEditAwayScore(match.awayScore !== null ? String(match.awayScore) : '0');
    setEditStatus(match.status);
    const dt = new Date(match.scheduledAt);
    const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditDateTime(localIso);
    setEditVenue(match.venue);

    // Preseleccionar equipo y primer jugador para amonestaciones y goles
    const defaultTeam = match.homeTeamId;
    setCardTeamId(defaultTeam);
    const defaultPlayers = players
      .filter((p) => p.teamId === defaultTeam)
      .sort((a, b) => a.jerseyNumber - b.jerseyNumber);
    setCardPlayerId(defaultPlayers[0]?.id || '');
    setCardType('amarilla');
    setCardRegularized(false);
    setCardNotes('');
    setCardError(null);

    const existingMatchGoals = matchGoals
      .filter((g) => g.matchId === match.id)
      .map((g) => ({
        teamId: g.teamId,
        playerId: g.playerId,
        goalsCount: g.goalsCount,
      }));
    setDraftGoals(existingMatchGoals);
    setGoalTeamId(defaultTeam);
    setGoalPlayerId(defaultPlayers[0]?.id || '');
    setGoalCountInput('1');
    setGoalError(null);
  };

  const handleCardTeamChange = (newTeamId: string) => {
    setCardTeamId(newTeamId);
    const roster = players
      .filter((p) => p.teamId === newTeamId)
      .sort((a, b) => a.jerseyNumber - b.jerseyNumber);
    setCardPlayerId(roster[0]?.id || '');
    setCardError(null);
  };

  const handleGoalTeamChange = (newTeamId: string) => {
    setGoalTeamId(newTeamId);
    const roster = players
      .filter((p) => p.teamId === newTeamId)
      .sort((a, b) => a.jerseyNumber - b.jerseyNumber);
    setGoalPlayerId(roster[0]?.id || '');
    setGoalError(null);
  };

  const handleAddDraftGoal = () => {
    if (!editingMatch) return;
    setGoalError(null);

    if (editStatus === 'programado') {
      setGoalError(
        'Cambia el estado del partido a En Juego o Finalizado e ingresa el marcador para asignar goles.'
      );
      return;
    }

    if (!goalTeamId || !goalPlayerId) {
      setGoalError(
        'Este equipo aún no tiene jugadores registrados en su nómina para asignar goles.'
      );
      return;
    }

    const count = Number(goalCountInput);
    if (!Number.isInteger(count) || count < 1) {
      setGoalError('Ingresa una cantidad entera de goles mayor o igual a 1.');
      return;
    }

    const isHome = goalTeamId === editingMatch.homeTeamId;
    const teamName = teamMap.get(goalTeamId)?.name || (isHome ? 'Local' : 'Visitante');
    const targetTeamScore = Number(isHome ? editHomeScore : editAwayScore);

    if (
      (isHome ? editHomeScore : editAwayScore) === '' ||
      !Number.isInteger(targetTeamScore) ||
      targetTeamScore < 0
    ) {
      setGoalError(
        `Ingresa un marcador válido para ${teamName} antes de asignar goleadores.`
      );
      return;
    }

    if (targetTeamScore === 0) {
      setGoalError(
        `El marcador de ${teamName} está en 0. Incrementa primero los goles del equipo en el marcador superior.`
      );
      return;
    }

    const currentTeamSum = draftGoals
      .filter((g) => g.teamId === goalTeamId)
      .reduce((sum, g) => sum + g.goalsCount, 0);

    if (currentTeamSum + count > targetTeamScore) {
      setGoalError(
        `La suma de goles de jugadores en ${teamName} (${currentTeamSum + count}) no puede ser mayor a los goles del equipo (${targetTeamScore}).`
      );
      return;
    }

    setDraftGoals((prev) => {
      const existing = prev.find((g) => g.playerId === goalPlayerId);
      if (existing) {
        return prev.map((g) =>
          g.playerId === goalPlayerId
            ? { ...g, goalsCount: g.goalsCount + count }
            : g
        );
      }
      return [...prev, { teamId: goalTeamId, playerId: goalPlayerId, goalsCount: count }];
    });
    setGoalCountInput('1');
  };

  const handleAdjustDraftGoal = (playerId: string, delta: number) => {
    if (!editingMatch) return;
    setGoalError(null);
    const entry = draftGoals.find((g) => g.playerId === playerId);
    if (!entry) return;

    if (delta > 0) {
      const isHome = entry.teamId === editingMatch.homeTeamId;
      const teamName =
        teamMap.get(entry.teamId)?.name || (isHome ? 'Local' : 'Visitante');
      const targetTeamScore = Number(isHome ? editHomeScore : editAwayScore);
      const currentTeamSum = draftGoals
        .filter((g) => g.teamId === entry.teamId)
        .reduce((sum, g) => sum + g.goalsCount, 0);

      if (
        !Number.isInteger(targetTeamScore) ||
        currentTeamSum + delta > targetTeamScore
      ) {
        setGoalError(
          `La suma de goles de jugadores en ${teamName} no puede superar los ${targetTeamScore || 0} goles del equipo.`
        );
        return;
      }
    }

    setDraftGoals((prev) =>
      prev
        .map((g) =>
          g.playerId === playerId
            ? { ...g, goalsCount: g.goalsCount + delta }
            : g
        )
        .filter((g) => g.goalsCount > 0)
    );
  };

  const handleRemoveDraftGoal = (playerId: string) => {
    setGoalError(null);
    setDraftGoals((prev) => prev.filter((g) => g.playerId !== playerId));
  };

  const handleAddMatchCard = async () => {
    if (!editingMatch) return;
    setCardError(null);

    if (!cardTeamId) {
      setCardError('Selecciona el equipo del jugador amonestado.');
      return;
    }
    if (!cardPlayerId) {
      setCardError(
        'Este equipo aún no tiene jugadores registrados en su nómina para asignar tarjetas.'
      );
      return;
    }

    setSavingCard(true);
    try {
      await onCreateMatchCard({
        championshipId: championship.id,
        matchId: editingMatch.id,
        teamId: cardTeamId,
        playerId: cardPlayerId,
        cardType,
        penaltyRegularized: cardRegularized,
        notes: cardNotes.trim(),
      });
      setCardNotes('');
      setCardRegularized(false);
    } catch (err) {
      setCardError(
        err instanceof Error
          ? err.message
          : 'No se pudo registrar la amonestación.'
      );
    } finally {
      setSavingCard(false);
    }
  };

  const handleSaveMatchResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;
    setEditError(null);

    let parsedHome: number | null = null;
    let parsedAway: number | null = null;

    if (editStatus !== 'programado') {
      if (editHomeScore === '' || editAwayScore === '') {
        setEditError('Ingresa ambos marcadores (0 o mayor) para guardar el resultado.');
        return;
      }
      parsedHome = Number(editHomeScore);
      parsedAway = Number(editAwayScore);
      if (
        isNaN(parsedHome) ||
        isNaN(parsedAway) ||
        parsedHome < 0 ||
        parsedAway < 0 ||
        !Number.isInteger(parsedHome) ||
        !Number.isInteger(parsedAway)
      ) {
        setEditError('Los goles o puntos deben ser números enteros mayores o iguales a 0.');
        return;
      }
    }

    const homeName = teamMap.get(editingMatch.homeTeamId)?.name || 'Local';
    const awayName = teamMap.get(editingMatch.awayTeamId)?.name || 'Visitante';
    const homeSum = draftGoals
      .filter((g) => g.teamId === editingMatch.homeTeamId)
      .reduce((sum, g) => sum + g.goalsCount, 0);
    const awaySum = draftGoals
      .filter((g) => g.teamId === editingMatch.awayTeamId)
      .reduce((sum, g) => sum + g.goalsCount, 0);

    if (editStatus === 'programado' && draftGoals.length > 0) {
      setEditError(
        'Un partido en estado Programado no puede tener goles asignados a jugadores. Cambia el estado o elimina los goles registrados.'
      );
      return;
    }

    if (editStatus === 'en_juego') {
      if (parsedHome !== null && homeSum > parsedHome) {
        setEditError(
          `La suma de goles de jugadores en ${homeName} (${homeSum}) supera el marcador actual (${parsedHome}).`
        );
        return;
      }
      if (parsedAway !== null && awaySum > parsedAway) {
        setEditError(
          `La suma de goles de jugadores en ${awayName} (${awaySum}) supera el marcador actual (${parsedAway}).`
        );
        return;
      }
    }

    if (editStatus === 'finalizado') {
      if (parsedHome !== null && homeSum !== parsedHome) {
        setEditError(
          `La suma de goles anotados por jugadores de ${homeName} (${homeSum}) debe coincidir exactamente con los goles del equipo (${parsedHome}).`
        );
        return;
      }
      if (parsedAway !== null && awaySum !== parsedAway) {
        setEditError(
          `La suma de goles anotados por jugadores de ${awayName} (${awaySum}) debe coincidir exactamente con los goles del equipo (${parsedAway}).`
        );
        return;
      }
    }

    setSaving(true);
    try {
      await onUpdateMatch({
        ...editingMatch,
        homeScore: parsedHome,
        awayScore: parsedAway,
        status: editStatus,
        scheduledAt: editDateTime ? new Date(editDateTime).toISOString() : editingMatch.scheduledAt,
        venue: editVenue.trim() || editingMatch.venue,
      });
      await onSyncMatchGoals(
        editingMatch.id,
        editStatus === 'programado' ? [] : draftGoals
      );
      setEditingMatch(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'No se pudo actualizar el encuentro.'
      );
    } finally {
      setSaving(false);
    }
  };

  const previewQualifiers = standings.slice(0, koQualifiers);
  const editingMatchCards = editingMatch
    ? matchCards.filter((c) => c.matchId === editingMatch.id)
    : [];
  const cardTeamPlayers = players
    .filter((p) => p.teamId === cardTeamId)
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber);
  const goalTeamPlayers = players
    .filter((p) => p.teamId === goalTeamId)
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber);

  const modalHomeGoalsSum = editingMatch
    ? draftGoals
        .filter((g) => g.teamId === editingMatch.homeTeamId)
        .reduce((sum, g) => sum + g.goalsCount, 0)
    : 0;
  const modalAwayGoalsSum = editingMatch
    ? draftGoals
        .filter((g) => g.teamId === editingMatch.awayTeamId)
        .reduce((sum, g) => sum + g.goalsCount, 0)
    : 0;
  const parsedModalHome =
    editStatus !== 'programado' && editHomeScore !== '' ? Number(editHomeScore) : 0;
  const parsedModalAway =
    editStatus !== 'programado' && editAwayScore !== '' ? Number(editAwayScore) : 0;

  return (
    <div className="space-y-6">
      {/* Cabecera de sección */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            Programación y llaves del torneo
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Encuentros de Todos contra Todos, Liguilla, Semifinales y Gran Final. Los resultados actualizan la tabla automáticamente.
          </p>
        </div>

        {adminUser && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openCreateModal}
              disabled={teams.length < 2}
              className="h-10 px-4 rounded-xl bg-[#10B981] text-[#022C22] text-xs sm:text-sm font-bold hover:bg-[#34D399] disabled:opacity-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Programar partido</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRoundRobinModal(true)}
              disabled={teams.length < 2}
              className="h-10 px-4 rounded-xl border border-white/[0.1] bg-[#111827] text-[#F8FAFC] text-xs sm:text-sm font-medium hover:bg-[#1E293B] disabled:opacity-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-[#06B6D4]" />
              <span>Generar Todos contra Todos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setKoError(null);
                setShowKnockoutModal(true);
              }}
              disabled={teams.length < 2}
              className="h-10 px-4 rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 text-[#34D399] text-xs sm:text-sm font-semibold hover:bg-[#10B981]/20 disabled:opacity-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <GitBranch className="w-4 h-4 text-[#10B981]" />
              <span>Avanzar fase (Liguilla / Final)</span>
            </button>
          </div>
        )}
      </div>

      {/* Filtro segmentado de etapas */}
      <div className="flex items-center gap-1.5 p-1 bg-[#111827] border border-white/[0.08] rounded-xl overflow-x-auto w-full sm:w-fit">
        {STAGE_TABS.map((tab) => {
          const isActive = stageFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStageFilter(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#10B981] text-[#022C22] font-bold'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Listado de encuentros estilo centro deportivo */}
      {Object.keys(groupedMatches).length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111827] p-10 text-center">
          <CalendarPlus className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
          <h3 className="text-base font-semibold text-[#F8FAFC]">
            Sin encuentros registrados en esta fase
          </h3>
          <p className="text-sm text-[#94A3B8] mt-1 max-w-md mx-auto">
            {teams.length < 2
              ? 'Primero registra al menos 2 equipos en la sección Equipos para poder generar la programación.'
              : 'El administrador puede programar partidos manuales o generar el fixture completo Todos contra Todos.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedMatches).map(([groupTitle, groupList]) => (
            <section key={groupTitle} className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <h2 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                  {groupTitle}
                </h2>
                <span className="text-xs text-[#94A3B8] tabular-nums">
                  {groupList.length} {groupList.length === 1 ? 'encuentro' : 'encuentros'}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {groupList.map((match) => {
                  const home = teamMap.get(match.homeTeamId);
                  const away = teamMap.get(match.awayTeamId);
                  const isFinished = match.status === 'finalizado';
                  const isLive = match.status === 'en_juego';

                  const cardsForMatch = matchCards.filter(
                    (c) => c.matchId === match.id
                  );
                  const goalsForMatch = matchGoals.filter(
                    (g) => g.matchId === match.id
                  );
                  const yellowCount = cardsForMatch.filter(
                    (c) => c.cardType === 'amarilla'
                  ).length;
                  const redCount = cardsForMatch.filter(
                    (c) => c.cardType === 'roja'
                  ).length;
                  const pendingCount = cardsForMatch.filter(
                    (c) => !c.penaltyRegularized
                  ).length;

                  return (
                    <article
                      key={match.id}
                      className="rounded-2xl border border-white/[0.08] bg-[#111827] p-4 sm:p-5 flex flex-col justify-between gap-3 hover:border-white/[0.15] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-[#94A3B8] tabular-nums">
                          {formatMatchDate(match.scheduledAt)} · {formatMatchTime(match.scheduledAt)} h
                        </span>
                        <span
                          className={`font-semibold ${
                            isFinished
                              ? 'text-[#10B981]'
                              : isLive
                              ? 'text-[#06B6D4]'
                              : 'text-[#94A3B8]'
                          }`}
                        >
                          {STATUS_LABELS[match.status]}
                        </span>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1">
                        {/* Local */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-[4px] shrink-0 ring-1 ring-white/20"
                              style={{ backgroundColor: home?.primaryColor || '#10B981' }}
                            />
                            <p className="text-sm sm:text-base font-bold text-[#F8FAFC] truncate">
                              {home?.name || 'Local'}
                            </p>
                          </div>
                        </div>

                        {/* Marcador central */}
                        <div
                          className={`px-3.5 py-2 rounded-xl min-w-[84px] text-center border ${
                            isFinished
                              ? 'bg-[#0F172A] text-[#10B981] border-[#10B981]/35'
                              : isLive
                              ? 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/45'
                              : 'bg-[#0F172A] text-[#94A3B8] border-white/[0.08]'
                          }`}
                        >
                          {match.homeScore !== null && match.awayScore !== null ? (
                            <span className="text-base sm:text-lg font-extrabold font-mono tabular-nums tracking-wider">
                              {match.homeScore} : {match.awayScore}
                            </span>
                          ) : (
                            <span className="text-xs font-bold font-mono tracking-wider text-[#CBD5E1]">
                              VS
                            </span>
                          )}
                        </div>

                        {/* Visitante */}
                        <div className="min-w-0 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <p className="text-sm sm:text-base font-bold text-[#F8FAFC] truncate">
                              {away?.name || 'Visitante'}
                            </p>
                            <span
                              className="w-3 h-3 rounded-[4px] shrink-0 ring-1 ring-white/20"
                              style={{ backgroundColor: away?.primaryColor || '#06B6D4' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Resumen de goleadores y tarjetas del partido si existen */}
                      {(goalsForMatch.length > 0 || cardsForMatch.length > 0) && (
                        <div className="space-y-1 pt-1 text-xs text-[#CBD5E1]">
                          {goalsForMatch.length > 0 && (
                            <p className="inline-flex items-center gap-1.5 text-[#94A3B8] truncate max-w-full">
                              <Target className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                              <span className="truncate">
                                Goles:{' '}
                                {goalsForMatch
                                  .map((g) => {
                                    const pl = playerMap.get(g.playerId);
                                    const name = pl?.fullName || 'Jugador';
                                    return g.goalsCount > 1
                                      ? `${name} (${g.goalsCount})`
                                      : name;
                                  })
                                  .join(', ')}
                              </span>
                            </p>
                          )}

                          {cardsForMatch.length > 0 && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              {yellowCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 font-medium text-amber-300 tabular-nums">
                                  <span className="w-2.5 h-3.5 rounded-[2px] bg-amber-400 inline-block" />
                                  {yellowCount} {yellowCount === 1 ? 'Amarilla' : 'Amarillas'}
                                </span>
                              )}
                              {redCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 font-medium text-rose-400 tabular-nums">
                                  <span className="w-2.5 h-3.5 rounded-[2px] bg-rose-500 inline-block" />
                                  {redCount} {redCount === 1 ? 'Roja' : 'Rojas'}
                                </span>
                              )}
                              <span className="text-[#64748B]" aria-hidden="true">·</span>
                              <span
                                className={`tabular-nums font-medium ${
                                  pendingCount > 0 ? 'text-amber-300' : 'text-[#10B981]'
                                }`}
                              >
                                {pendingCount > 0
                                  ? `${pendingCount} penalidad(es) pendiente(s)`
                                  : 'Penalidades regularizadas'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-3 text-xs text-[#94A3B8]">
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                          <span className="truncate">
                            {match.venue}
                            {match.notes ? ` · ${match.notes}` : ''}
                          </span>
                        </span>

                        {adminUser && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditMatchModal(match)}
                              className="h-8 px-3 rounded-lg border border-white/[0.1] bg-[#1E293B] hover:bg-[#273549] text-[#F8FAFC] font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#10B981]" />
                              <span>{isFinished ? 'Editar resultado / tarjetas' : 'Registrar resultado'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteMatch(match.id)}
                              aria-label="Eliminar encuentro"
                              className="h-8 w-8 rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal: Programar partido individual */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#111827] border border-white/[0.1] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#F8FAFC]">Programar encuentro</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSingleMatch} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-sm text-rose-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    Equipo Local
                  </label>
                  <select
                    value={homeId}
                    onChange={(e) => setHomeId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    Equipo Visitante
                  </label>
                  <select
                    value={awayId}
                    onChange={(e) => setAwayId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    Fase
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as MatchStage)}
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  >
                    <option value="todos_contra_todos">Todos contra Todos</option>
                    <option value="liguilla">Liguilla</option>
                    <option value="semifinal">Semifinal</option>
                    <option value="tercer_puesto">Tercer Puesto</option>
                    <option value="final">Gran Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    Jornada / Fecha N°
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={matchday}
                    onChange={(e) => setMatchday(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] tabular-nums focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    Fecha y hora
                  </label>
                  <input
                    type="datetime-local"
                    value={dateTimeLocal}
                    onChange={(e) => setDateTimeLocal(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] tabular-nums focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    Escenario / Cancha
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                  Observación breve (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Encuentro por la Jornada 4"
                  className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-10 px-4 rounded-xl border border-white/[0.1] bg-[#1E293B] text-sm font-medium text-[#F8FAFC] hover:bg-[#273549]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-[#10B981] text-[#022C22] text-sm font-bold hover:bg-[#34D399] disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar partido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Generador Todos contra Todos */}
      {showRoundRobinModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#111827] border border-white/[0.1] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#F8FAFC]">
                Generar Fixture Todos contra Todos
              </h2>
              <button
                type="button"
                onClick={() => setShowRoundRobinModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGenerateRoundRobin} className="p-6 space-y-4">
              <p className="text-sm text-[#94A3B8]">
                Se generarán automáticamente todos los cruces de liga para los{' '}
                <strong className="text-[#F8FAFC]">{teams.length} equipos</strong> inscritos en este campeonato (una fecha semanal desde la fecha de inicio).
              </p>
              <div>
                <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                  Fecha de inicio (Jornada 1)
                </label>
                <input
                  type="date"
                  value={rrStartDate}
                  onChange={(e) => setRrStartDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] tabular-nums focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                  Cancha predeterminada
                </label>
                <input
                  type="text"
                  value={rrVenue}
                  onChange={(e) => setRrVenue(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoundRobinModal(false)}
                  className="h-10 px-4 rounded-xl border border-white/[0.1] bg-[#1E293B] text-sm font-medium text-[#F8FAFC] hover:bg-[#273549]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-[#10B981] text-[#022C22] text-sm font-bold hover:bg-[#34D399] disabled:opacity-60"
                >
                  {saving ? 'Generando...' : 'Generar jornadas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Avanzar a Liguilla / Semifinales / Final */}
      {showKnockoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#111827] border border-white/[0.1] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#F8FAFC]">
                Determinar clasificados y avanzar fase
              </h2>
              <button
                type="button"
                onClick={() => setShowKnockoutModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGenerateKnockout} className="p-6 space-y-4">
              {koError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-sm text-rose-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                  <span>{koError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    Fase a generar
                  </label>
                  <select
                    value={koTargetStage}
                    onChange={(e) =>
                      setKoTargetStage(e.target.value as 'liguilla' | 'semifinal' | 'final')
                    }
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  >
                    <option value="liguilla">Liguilla (Llaves directas)</option>
                    <option value="semifinal">Semifinales (4 mejores)</option>
                    <option value="final">Final y 3er Puesto</option>
                  </select>
                </div>

                {koTargetStage === 'liguilla' && (
                  <div>
                    <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                      Cantidad de clasificados
                    </label>
                    <select
                      value={koQualifiers}
                      onChange={(e) => setKoQualifiers(Number(e.target.value))}
                      className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                    >
                      <option value={4}>Top 4 equipos</option>
                      <option value={6}>Top 6 equipos</option>
                      <option value={8}>Top 8 equipos</option>
                    </select>
                  </div>
                )}
              </div>

              {koTargetStage === 'liguilla' && previewQualifiers.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] p-3.5">
                  <p className="text-xs font-semibold text-[#10B981] mb-2">
                    Clasificados actuales según Tabla de Posiciones:
                  </p>
                  <ul className="space-y-1 text-xs text-[#CBD5E1]">
                    {previewQualifiers.map((row) => (
                      <li key={row.team.id} className="flex items-center justify-between">
                        <span>
                          <strong className="tabular-nums text-[#F8FAFC]">{row.position}°</strong> {row.team.name}
                        </span>
                        <span className="font-mono tabular-nums text-[#94A3B8]">
                          {row.points} pts · DG {row.goalDifference >= 0 ? `+${row.goalDifference}` : row.goalDifference}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    Fecha programada
                  </label>
                  <input
                    type="date"
                    value={koStartDate}
                    onChange={(e) => setKoStartDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] tabular-nums focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                    Sede
                  </label>
                  <input
                    type="text"
                    value={koVenue}
                    onChange={(e) => setKoVenue(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKnockoutModal(false)}
                  className="h-10 px-4 rounded-xl border border-white/[0.1] bg-[#1E293B] text-sm font-medium text-[#F8FAFC] hover:bg-[#273549]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-[#10B981] text-[#022C22] text-sm font-bold hover:bg-[#34D399] disabled:opacity-60"
                >
                  {saving ? 'Creando llaves...' : 'Generar cruces'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar resultado, amonestaciones y editar partido */}
      {editingMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl bg-[#111827] border border-white/[0.1] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">
                  Marcador, goleadores y amonestaciones
                </h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {teamMap.get(editingMatch.homeTeamId)?.name || 'Local'} vs{' '}
                  {teamMap.get(editingMatch.awayTeamId)?.name || 'Visitante'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveMatchResult}
              className="p-6 space-y-5 overflow-y-auto overscroll-contain flex-1"
            >
              {editError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-sm text-rose-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#CBD5E1] mb-1">
                  Estado del partido
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as MatchStatus)}
                  className="w-full h-11 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                >
                  <option value="programado">Programado (Sin iniciar)</option>
                  <option value="en_juego">En Juego (Marcador parcial)</option>
                  <option value="finalizado">Finalizado (Actualiza Tabla)</option>
                </select>
              </div>

              {editStatus !== 'programado' && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 p-4 rounded-xl bg-[#0F172A] border border-white/[0.08]">
                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 truncate">
                      {teamMap.get(editingMatch.homeTeamId)?.name || 'Local'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={editHomeScore}
                      onChange={(e) => setEditHomeScore(e.target.value)}
                      className="w-full h-12 text-center text-xl font-bold font-mono tabular-nums rounded-xl border border-white/[0.1] bg-[#111827] text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                  <span className="pb-3 font-bold text-[#64748B]">:</span>
                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 text-right truncate">
                      {teamMap.get(editingMatch.awayTeamId)?.name || 'Visitante'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={editAwayScore}
                      onChange={(e) => setEditAwayScore(e.target.value)}
                      className="w-full h-12 text-center text-xl font-bold font-mono tabular-nums rounded-xl border border-white/[0.1] bg-[#111827] text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    Fecha y hora
                  </label>
                  <input
                    type="datetime-local"
                    value={editDateTime}
                    onChange={(e) => setEditDateTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-xs text-[#F8FAFC] tabular-nums focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    Sede
                  </label>
                  <input
                    type="text"
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              {/* Sección de Goleadores del encuentro */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0F172A] p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#F8FAFC] inline-flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[#10B981]" />
                    <span>Goleadores del encuentro</span>
                  </span>
                  {editStatus !== 'programado' && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums">
                      <span
                        className={
                          modalHomeGoalsSum === parsedModalHome
                            ? 'text-[#10B981] font-semibold'
                            : modalHomeGoalsSum > parsedModalHome
                            ? 'text-rose-400 font-semibold'
                            : 'text-amber-300 font-semibold'
                        }
                      >
                        {teamMap.get(editingMatch.homeTeamId)?.name || 'Local'}:{' '}
                        {modalHomeGoalsSum}/{isNaN(parsedModalHome) ? 0 : parsedModalHome}
                      </span>
                      <span className="text-[#475569]" aria-hidden="true">·</span>
                      <span
                        className={
                          modalAwayGoalsSum === parsedModalAway
                            ? 'text-[#10B981] font-semibold'
                            : modalAwayGoalsSum > parsedModalAway
                            ? 'text-rose-400 font-semibold'
                            : 'text-amber-300 font-semibold'
                        }
                      >
                        {teamMap.get(editingMatch.awayTeamId)?.name || 'Visitante'}:{' '}
                        {modalAwayGoalsSum}/{isNaN(parsedModalAway) ? 0 : parsedModalAway}
                      </span>
                    </div>
                  )}
                </div>

                {goalError && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-950/60 border border-rose-500/40 p-2.5 text-xs text-rose-200">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                    <span>{goalError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_92px] gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                      Equipo
                    </label>
                    <select
                      value={goalTeamId}
                      onChange={(e) => handleGoalTeamChange(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-white/[0.1] bg-[#111827] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                    >
                      <option value={editingMatch.homeTeamId}>
                        {teamMap.get(editingMatch.homeTeamId)?.name || 'Local'}
                      </option>
                      <option value={editingMatch.awayTeamId}>
                        {teamMap.get(editingMatch.awayTeamId)?.name || 'Visitante'}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                      Jugador que anotó
                    </label>
                    <select
                      value={goalPlayerId}
                      onChange={(e) => setGoalPlayerId(e.target.value)}
                      disabled={goalTeamPlayers.length === 0}
                      className="w-full h-9 px-2.5 rounded-lg border border-white/[0.1] bg-[#111827] text-xs text-[#F8FAFC] disabled:opacity-50 focus:outline-none focus:border-[#10B981]"
                    >
                      {goalTeamPlayers.length === 0 ? (
                        <option value="">Sin jugadores registrados</option>
                      ) : (
                        goalTeamPlayers.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            #{pl.jerseyNumber} — {pl.fullName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                      Goles
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={goalCountInput}
                      onChange={(e) => setGoalCountInput(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-white/[0.1] bg-[#111827] text-xs text-center font-mono tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <p className="text-[11px] text-[#94A3B8]">
                    La suma de goles por jugador debe coincidir con el marcador de cada equipo al finalizar.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddDraftGoal}
                    disabled={goalTeamPlayers.length === 0}
                    className="h-9 px-3.5 rounded-lg bg-[#1E293B] border border-[#10B981]/35 hover:bg-[#273549] text-xs font-semibold text-[#10B981] disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar gol</span>
                  </button>
                </div>

                {draftGoals.length > 0 && (
                  <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-xl overflow-hidden bg-[#111827]">
                    {draftGoals.map((goal) => {
                      const pl = playerMap.get(goal.playerId);
                      const tm = teamMap.get(goal.teamId);
                      return (
                        <div
                          key={goal.playerId}
                          className="p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-[3px] shrink-0 ring-1 ring-white/20"
                              style={{ backgroundColor: tm?.primaryColor || '#10B981' }}
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[#F8FAFC] truncate">
                                #{pl?.jerseyNumber ?? '?'} {pl?.fullName || 'Jugador'}{' '}
                                <span className="font-normal text-[#94A3B8]">
                                  ({tm?.name || 'Equipo'})
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAdjustDraftGoal(goal.playerId, -1)}
                              aria-label="Restar un gol"
                              className="h-7 w-7 rounded-lg border border-white/[0.1] bg-[#1E293B] text-[#CBD5E1] hover:text-[#F8FAFC] flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="min-w-[34px] text-center font-mono tabular-nums font-bold text-[#10B981]">
                              {goal.goalsCount} {goal.goalsCount === 1 ? 'gol' : 'goles'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustDraftGoal(goal.playerId, 1)}
                              aria-label="Sumar un gol"
                              className="h-7 w-7 rounded-lg border border-white/[0.1] bg-[#1E293B] text-[#CBD5E1] hover:text-[#F8FAFC] flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftGoal(goal.playerId)}
                              aria-label="Quitar goleador"
                              className="h-7 w-7 rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center ml-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sección de Amonestaciones del encuentro (Tarjetas Amarillas y Rojas) */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0F172A] p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#F8FAFC] inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Amonestaciones del encuentro (Tarjetas)</span>
                  </span>
                  <span className="text-[11px] text-[#94A3B8] tabular-nums">
                    {editingMatchCards.length}{' '}
                    {editingMatchCards.length === 1 ? 'registrada' : 'registradas'}
                  </span>
                </div>

                {cardError && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-950/60 border border-rose-500/40 p-2.5 text-xs text-rose-200">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                    <span>{cardError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                      Equipo
                    </label>
                    <select
                      value={cardTeamId}
                      onChange={(e) => handleCardTeamChange(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-white/[0.1] bg-[#111827] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                    >
                      <option value={editingMatch.homeTeamId}>
                        {teamMap.get(editingMatch.homeTeamId)?.name || 'Local'}
                      </option>
                      <option value={editingMatch.awayTeamId}>
                        {teamMap.get(editingMatch.awayTeamId)?.name || 'Visitante'}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                      Jugador amonestado
                    </label>
                    <select
                      value={cardPlayerId}
                      onChange={(e) => setCardPlayerId(e.target.value)}
                      disabled={cardTeamPlayers.length === 0}
                      className="w-full h-9 px-2.5 rounded-lg border border-white/[0.1] bg-[#111827] text-xs text-[#F8FAFC] disabled:opacity-50 focus:outline-none focus:border-[#10B981]"
                    >
                      {cardTeamPlayers.length === 0 ? (
                        <option value="">Sin jugadores registrados</option>
                      ) : (
                        cardTeamPlayers.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            #{pl.jerseyNumber} — {pl.fullName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                      Tipo de tarjeta
                    </label>
                    <select
                      value={cardType}
                      onChange={(e) => setCardType(e.target.value as CardType)}
                      className="w-full h-9 px-2.5 rounded-lg border border-white/[0.1] bg-[#111827] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                    >
                      <option value="amarilla">Tarjeta Amarilla</option>
                      <option value="roja">Tarjeta Roja</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#94A3B8] mb-1">
                      Motivo / detalle (opcional)
                    </label>
                    <input
                      type="text"
                      value={cardNotes}
                      onChange={(e) => setCardNotes(e.target.value)}
                      placeholder="Ej. Falta táctica min. 32"
                      maxLength={120}
                      className="w-full h-9 px-2.5 rounded-lg border border-white/[0.1] bg-[#111827] text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <label className="inline-flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cardRegularized}
                      onChange={(e) => setCardRegularized(e.target.checked)}
                      className="w-4 h-4 accent-[#10B981] rounded"
                    />
                    <span>Penalidad regularizada</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAddMatchCard}
                    disabled={savingCard || cardTeamPlayers.length === 0}
                    className="h-9 px-3.5 rounded-lg bg-[#1E293B] border border-[#10B981]/35 hover:bg-[#273549] text-xs font-semibold text-[#10B981] disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{savingCard ? 'Agregando...' : 'Agregar amonestación'}</span>
                  </button>
                </div>

                {/* Lista de tarjetas ya registradas en este partido */}
                {editingMatchCards.length > 0 && (
                  <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-xl overflow-hidden bg-[#111827]">
                    {editingMatchCards.map((card) => {
                      const pl = playerMap.get(card.playerId);
                      const tm = teamMap.get(card.teamId);
                      return (
                        <div
                          key={card.id}
                          className="p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-2.5 h-4 rounded-[2px] shrink-0 ${
                                card.cardType === 'amarilla'
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                              title={
                                card.cardType === 'amarilla'
                                  ? 'Tarjeta Amarilla'
                                  : 'Tarjeta Roja'
                              }
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[#F8FAFC] truncate">
                                #{pl?.jerseyNumber ?? '?'} {pl?.fullName || 'Jugador'}{' '}
                                <span className="font-normal text-[#94A3B8]">
                                  ({tm?.name || 'Equipo'})
                                </span>
                              </p>
                              {card.notes && (
                                <p className="text-[11px] text-[#94A3B8] truncate">
                                  {card.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={card.penaltyRegularized}
                                onChange={(e) =>
                                  onUpdateMatchCard({
                                    ...card,
                                    penaltyRegularized: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 accent-[#10B981] rounded"
                              />
                              <span
                                className={
                                  card.penaltyRegularized
                                    ? 'text-[#10B981] font-medium'
                                    : 'text-amber-300 font-medium'
                                }
                              >
                                {card.penaltyRegularized ? 'Regularizada' : 'Pendiente'}
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => onDeleteMatchCard(card.id)}
                              aria-label="Eliminar amonestación"
                              className="h-7 w-7 rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="h-10 px-4 rounded-xl border border-white/[0.1] bg-[#1E293B] text-sm font-medium text-[#F8FAFC] hover:bg-[#273549]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-[#10B981] text-[#022C22] text-sm font-bold hover:bg-[#34D399] inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Guardando...' : 'Guardar cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
