'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  Edit3,
  GitBranch,
  MapPin,
  Sparkles,
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
  Championship,
  Match,
  MatchStage,
  MatchStatus,
  StandingRow,
  Team,
} from '@/lib/types';

interface ProgramacionViewProps {
  championship: Championship;
  teams: Team[];
  matches: Match[];
  standings: StandingRow[];
  adminUser: AdminUser | null;
  onCreateMatches: (inputs: Omit<Match, 'id' | 'createdAt'>[]) => Promise<void>;
  onUpdateMatch: (match: Match) => Promise<void>;
  onDeleteMatch: (matchId: string) => Promise<void>;
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
  matches,
  standings,
  adminUser,
  onCreateMatches,
  onUpdateMatch,
  onDeleteMatch,
}: ProgramacionViewProps) {
  const [stageFilter, setStageFilter] = useState<'todos' | MatchStage>('todos');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoundRobinModal, setShowRoundRobinModal] = useState(false);
  const [showKnockoutModal, setShowKnockoutModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

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

  const teamMap = new Map(teams.map((t) => [t.id, t]));

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

  return (
    <div className="space-y-6">
      {/* Cabecera de sección */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Programación y llaves del torneo
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Encuentros de Todos contra Todos, Liguilla, Semifinales y Gran Final. Los resultados actualizan la tabla automáticamente.
          </p>
        </div>

        {adminUser && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openCreateModal}
              disabled={teams.length < 2}
              className="h-10 px-4 rounded-xl bg-[#0D5C63] text-white text-xs sm:text-sm font-semibold hover:bg-[#0A494F] disabled:opacity-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Programar partido</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRoundRobinModal(true)}
              disabled={teams.length < 2}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs sm:text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-[#0D5C63]" />
              <span>Generar Todos contra Todos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setKoError(null);
                setShowKnockoutModal(true);
              }}
              disabled={teams.length < 2}
              className="h-10 px-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs sm:text-sm font-semibold hover:bg-emerald-100 disabled:opacity-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <GitBranch className="w-4 h-4 text-emerald-700" />
              <span>Avanzar fase (Liguilla / Final)</span>
            </button>
          </div>
        )}
      </div>

      {/* Filtro segmentado de etapas */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl overflow-x-auto w-full sm:w-fit">
        {STAGE_TABS.map((tab) => {
          const isActive = stageFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStageFilter(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white text-[#0D5C63] font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Listado de encuentros estilo centro deportivo */}
      {Object.keys(groupedMatches).length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <CalendarPlus className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-slate-900">
            Sin encuentros registrados en esta fase
          </h3>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            {teams.length < 2
              ? 'Primero registra al menos 2 equipos en la sección Equipos para poder generar la programación.'
              : 'El administrador puede programar partidos manuales o generar el fixture completo Todos contra Todos.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedMatches).map(([groupTitle, groupList]) => (
            <section key={groupTitle} className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {groupTitle}
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {groupList.length} {groupList.length === 1 ? 'encuentro' : 'encuentros'}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {groupList.map((match) => {
                  const home = teamMap.get(match.homeTeamId);
                  const away = teamMap.get(match.awayTeamId);
                  const isFinished = match.status === 'finalizado';
                  const isLive = match.status === 'en_juego';

                  return (
                    <article
                      key={match.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500 tabular-nums">
                          {formatMatchDate(match.scheduledAt)} · {formatMatchTime(match.scheduledAt)} h
                        </span>
                        <span
                          className={`font-semibold ${
                            isFinished
                              ? 'text-slate-700'
                              : isLive
                              ? 'text-emerald-700'
                              : 'text-[#0D5C63]'
                          }`}
                        >
                          {STATUS_LABELS[match.status]}
                        </span>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1">
                        {/* Local */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{ backgroundColor: home?.primaryColor || '#0D5C63' }}
                            />
                            <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                              {home?.name || 'Local'}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 truncate pl-5">
                            {home?.serviceArea}
                          </p>
                        </div>

                        {/* Marcador central */}
                        <div
                          className={`px-3.5 py-2 rounded-xl min-w-[84px] text-center border ${
                            isFinished
                              ? 'bg-slate-900 text-white border-slate-900'
                              : isLive
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {match.homeScore !== null && match.awayScore !== null ? (
                            <span className="text-base sm:text-lg font-extrabold font-mono tabular-nums tracking-wider">
                              {match.homeScore} : {match.awayScore}
                            </span>
                          ) : (
                            <span className="text-xs font-bold font-mono tracking-wider">
                              VS
                            </span>
                          )}
                        </div>

                        {/* Visitante */}
                        <div className="min-w-0 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                              {away?.name || 'Visitante'}
                            </p>
                            <span
                              className="w-3 h-3 rounded-sm shrink-0"
                              style={{ backgroundColor: away?.primaryColor || '#059669' }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 truncate pr-5">
                            {away?.serviceArea}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                              className="h-8 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#0D5C63]" />
                              <span>{isFinished ? 'Editar marcador' : 'Registrar resultado'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteMatch(match.id)}
                              aria-label="Eliminar encuentro"
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Programar encuentro</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSingleMatch} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Equipo Local
                  </label>
                  <select
                    value={homeId}
                    onChange={(e) => setHomeId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Equipo Visitante
                  </label>
                  <select
                    value={awayId}
                    onChange={(e) => setAwayId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fase
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as MatchStage)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="todos_contra_todos">Todos contra Todos</option>
                    <option value="liguilla">Liguilla</option>
                    <option value="semifinal">Semifinal</option>
                    <option value="tercer_puesto">Tercer Puesto</option>
                    <option value="final">Gran Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Jornada / Fecha N°
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={matchday}
                    onChange={(e) => setMatchday(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha y hora
                  </label>
                  <input
                    type="datetime-local"
                    value={dateTimeLocal}
                    onChange={(e) => setDateTimeLocal(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Escenario / Cancha
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observación breve (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Encuentro por la Jornada 4"
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F] disabled:opacity-60"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Generar Fixture Todos contra Todos
              </h2>
              <button
                type="button"
                onClick={() => setShowRoundRobinModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGenerateRoundRobin} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Se generarán automáticamente todos los cruces de liga para los{' '}
                <strong className="text-slate-900">{teams.length} equipos</strong> inscritos en este campeonato (una fecha semanal desde la fecha de inicio).
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de inicio (Jornada 1)
                </label>
                <input
                  type="date"
                  value={rrStartDate}
                  onChange={(e) => setRrStartDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cancha predeterminada
                </label>
                <input
                  type="text"
                  value={rrVenue}
                  onChange={(e) => setRrVenue(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoundRobinModal(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F] disabled:opacity-60"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Determinar clasificados y avanzar fase
              </h2>
              <button
                type="button"
                onClick={() => setShowKnockoutModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGenerateKnockout} className="p-6 space-y-4">
              {koError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                  <span>{koError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fase a generar
                  </label>
                  <select
                    value={koTargetStage}
                    onChange={(e) =>
                      setKoTargetStage(e.target.value as 'liguilla' | 'semifinal' | 'final')
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="liguilla">Liguilla (Llaves directas)</option>
                    <option value="semifinal">Semifinales (4 mejores)</option>
                    <option value="final">Final y 3er Puesto</option>
                  </select>
                </div>

                {koTargetStage === 'liguilla' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cantidad de clasificados
                    </label>
                    <select
                      value={koQualifiers}
                      onChange={(e) => setKoQualifiers(Number(e.target.value))}
                      className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                    >
                      <option value={4}>Top 4 equipos</option>
                      <option value={6}>Top 6 equipos</option>
                      <option value={8}>Top 8 equipos</option>
                    </select>
                  </div>
                )}
              </div>

              {koTargetStage === 'liguilla' && previewQualifiers.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Clasificados actuales según Tabla de Posiciones:
                  </p>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {previewQualifiers.map((row) => (
                      <li key={row.team.id} className="flex items-center justify-between">
                        <span>
                          <strong className="tabular-nums">{row.position}°</strong> {row.team.name}
                        </span>
                        <span className="font-mono tabular-nums text-slate-500">
                          {row.points} pts · DG {row.goalDifference >= 0 ? `+${row.goalDifference}` : row.goalDifference}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha programada
                  </label>
                  <input
                    type="date"
                    value={koStartDate}
                    onChange={(e) => setKoStartDate(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sede
                  </label>
                  <input
                    type="text"
                    value={koVenue}
                    onChange={(e) => setKoVenue(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKnockoutModal(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F] disabled:opacity-60"
                >
                  {saving ? 'Creando llaves...' : 'Generar cruces'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar resultado / Editar partido */}
      {editingMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Marcador y estado del encuentro
              </h2>
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMatchResult} className="p-6 space-y-4">
              {editError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Estado del partido
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as MatchStatus)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="programado">Programado (Sin iniciar)</option>
                  <option value="en_juego">En Juego (Marcador parcial)</option>
                  <option value="finalizado">Finalizado (Actualiza Tabla)</option>
                </select>
              </div>

              {editStatus !== 'programado' && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 truncate">
                      {teamMap.get(editingMatch.homeTeamId)?.name || 'Local'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={editHomeScore}
                      onChange={(e) => setEditHomeScore(e.target.value)}
                      className="w-full h-12 text-center text-xl font-bold font-mono tabular-nums rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                  <span className="pb-3 font-bold text-slate-400">:</span>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 text-right truncate">
                      {teamMap.get(editingMatch.awayTeamId)?.name || 'Visitante'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={editAwayScore}
                      onChange={(e) => setEditAwayScore(e.target.value)}
                      className="w-full h-12 text-center text-xl font-bold font-mono tabular-nums rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Fecha y hora
                  </label>
                  <input
                    type="datetime-local"
                    value={editDateTime}
                    onChange={(e) => setEditDateTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Sede
                  </label>
                  <input
                    type="text"
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F] inline-flex items-center gap-2"
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
