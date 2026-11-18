'use client';

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Edit3,
  Plus,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { uploadTournamentImage } from '@/lib/cloudinary';
import {
  HOSPITAL_SERVICE_AREAS,
  TEAM_PALETTE_OPTIONS,
  calculateAge,
  createProvisionalAvatarUrl,
  validateBirthDate,
} from '@/lib/tournament-utils';
import { AdminUser, Championship, Player, Team } from '@/lib/types';
import SafeImage from './SafeImage';

interface EquiposViewProps {
  championship: Championship;
  teams: Team[];
  players: Player[];
  adminUser: AdminUser | null;
  onCreateTeam: (input: Omit<Team, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateTeam: (team: Team) => Promise<void>;
  onDeleteTeam: (teamId: string) => Promise<void>;
  onCreatePlayer: (input: Omit<Player, 'id' | 'createdAt'>) => Promise<void>;
  onUpdatePlayer: (player: Player) => Promise<void>;
  onDeletePlayer: (playerId: string) => Promise<void>;
}

export default function EquiposView({
  championship,
  teams,
  players,
  adminUser,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onCreatePlayer,
  onUpdatePlayer,
  onDeletePlayer,
}: EquiposViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);

  useLockBodyScroll(Boolean(showNewTeamModal || selectedTeamId));

  // Form: Nuevo Equipo (sin servicio o área principal)
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState(TEAM_PALETTE_OPTIONS[0].hex);
  const [resp1Name, setResp1Name] = useState('');
  const [resp1Phone, setResp1Phone] = useState('');
  const [resp2Name, setResp2Name] = useState('');
  const [resp2Phone, setResp2Phone] = useState('');
  const [teamError, setTeamError] = useState<string | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);

  // Modal Detalle de Equipo
  const [modalTab, setModalTab] = useState<'jugadores' | 'datos'>('jugadores');
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamArea, setEditTeamArea] = useState('');
  const [editTeamColor, setEditTeamColor] = useState('#0D5C63');
  const [editResp1Name, setEditResp1Name] = useState('');
  const [editResp1Phone, setEditResp1Phone] = useState('');
  const [editResp2Name, setEditResp2Name] = useState('');
  const [editResp2Phone, setEditResp2Phone] = useState('');
  const [editTeamMsg, setEditTeamMsg] = useState<string | null>(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false);

  // Form: Jugador (Crear / Editar dentro del modal de equipo)
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [plName, setPlName] = useState('');
  const [plJersey, setPlJersey] = useState('10');
  const [plBirthDate, setPlBirthDate] = useState('1994-05-15');
  const [plArea, setPlArea] = useState(HOSPITAL_SERVICE_AREAS[0]);
  const [plUseProvisional, setPlUseProvisional] = useState(true);
  const [plFile, setPlFile] = useState<File | null>(null);
  const [plPreviewUrl, setPlPreviewUrl] = useState('');
  const [plError, setPlError] = useState<string | null>(null);
  const [savingPlayer, setSavingPlayer] = useState(false);
  const playerFileInputRef = useRef<HTMLInputElement>(null);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || null;
  const teamPlayers = selectedTeam
    ? players
        .filter((p) => p.teamId === selectedTeam.id)
        .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
    : [];

  const filteredTeams = teams.filter((team) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const rosterMatches = players.some(
      (p) => p.teamId === team.id && p.fullName.toLowerCase().includes(q)
    );
    return (
      team.name.toLowerCase().includes(q) ||
      team.serviceArea.toLowerCase().includes(q) ||
      team.responsible1Name.toLowerCase().includes(q) ||
      team.responsible2Name.toLowerCase().includes(q) ||
      rosterMatches
    );
  });

  const openTeamDetail = (team: Team) => {
    setSelectedTeamId(team.id);
    setModalTab('jugadores');
    setEditTeamName(team.name);
    setEditTeamArea(team.serviceArea);
    setEditTeamColor(team.primaryColor);
    setEditResp1Name(team.responsible1Name);
    setEditResp1Phone(team.responsible1Phone);
    setEditResp2Name(team.responsible2Name);
    setEditResp2Phone(team.responsible2Phone);
    setEditTeamMsg(null);
    setConfirmDeleteTeam(false);
    setShowPlayerForm(false);
    setEditingPlayer(null);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError(null);

    if (teamName.trim().length < 3) {
      setTeamError('El nombre del equipo debe tener al menos 3 caracteres.');
      return;
    }
    if (
      teams.some(
        (t) => t.name.trim().toLowerCase() === teamName.trim().toLowerCase()
      )
    ) {
      setTeamError('Ya existe un equipo con ese nombre en este campeonato.');
      return;
    }
    if (resp1Name.trim().length < 3) {
      setTeamError('Ingresa el nombre del Responsable 1 del equipo.');
      return;
    }

    setSavingTeam(true);
    try {
      await onCreateTeam({
        championshipId: championship.id,
        name: teamName.trim(),
        serviceArea: '',
        primaryColor: teamColor,
        responsible1Name: resp1Name.trim(),
        responsible1Phone: resp1Phone.trim(),
        responsible2Name: resp2Name.trim(),
        responsible2Phone: resp2Phone.trim(),
      });
      setTeamName('');
      setResp1Name('');
      setResp1Phone('');
      setResp2Name('');
      setResp2Phone('');
      setShowNewTeamModal(false);
    } catch (err) {
      setTeamError(
        err instanceof Error ? err.message : 'No se pudo registrar el equipo.'
      );
    } finally {
      setSavingTeam(false);
    }
  };

  const handleSaveTeamEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setEditTeamMsg(null);

    if (editTeamName.trim().length < 3) {
      setEditTeamMsg('El nombre del equipo debe tener al menos 3 caracteres.');
      return;
    }
    if (editResp1Name.trim().length < 3) {
      setEditTeamMsg('Ingresa el nombre del Responsable 1.');
      return;
    }

    setSavingTeam(true);
    try {
      await onUpdateTeam({
        ...selectedTeam,
        name: editTeamName.trim(),
        serviceArea: editTeamArea,
        primaryColor: editTeamColor,
        responsible1Name: editResp1Name.trim(),
        responsible1Phone: editResp1Phone.trim(),
        responsible2Name: editResp2Name.trim(),
        responsible2Phone: editResp2Phone.trim(),
      });
      setEditTeamMsg('Datos del equipo actualizados correctamente.');
    } finally {
      setSavingTeam(false);
    }
  };

  const openAddPlayerForm = () => {
    if (!selectedTeam) return;
    setEditingPlayer(null);
    setPlName('');
    setPlJersey('');
    setPlBirthDate('1994-05-15');
    setPlArea(selectedTeam.serviceArea);
    setPlUseProvisional(true);
    setPlFile(null);
    setPlPreviewUrl('');
    setPlError(null);
    setShowPlayerForm(true);
  };

  const openEditPlayerForm = (player: Player) => {
    setEditingPlayer(player);
    setPlName(player.fullName);
    setPlJersey(String(player.jerseyNumber));
    setPlBirthDate(player.birthDate);
    setPlArea(player.serviceArea);
    setPlUseProvisional(player.isProvisionalPhoto);
    setPlFile(null);
    setPlPreviewUrl(player.isProvisionalPhoto ? '' : player.photoUrl);
    setPlError(null);
    setShowPlayerForm(true);
  };

  const handlePlayerPhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setPlError('Formato inválido. Usa JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPlError('La fotografía supera el máximo permitido de 5 MB.');
      return;
    }
    setPlFile(file);
    setPlUseProvisional(false);
    setPlPreviewUrl(URL.createObjectURL(file));
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setPlError(null);

    if (plName.trim().length < 3) {
      setPlError('Ingresa el nombre completo del jugador (mínimo 3 caracteres).');
      return;
    }

    const jerseyNum = Number(plJersey);
    if (!Number.isInteger(jerseyNum) || jerseyNum < 1 || jerseyNum > 99) {
      setPlError('El número de camiseta debe ser un entero entre 1 y 99.');
      return;
    }

    const duplicateJersey = teamPlayers.some(
      (p) => p.jerseyNumber === jerseyNum && p.id !== editingPlayer?.id
    );
    if (duplicateJersey) {
      setPlError(
        `La camiseta #${jerseyNum} ya está asignada a otro jugador de ${selectedTeam.name}. Elige otro dorsal.`
      );
      return;
    }

    const birthValidation = validateBirthDate(plBirthDate);
    if (birthValidation) {
      setPlError(birthValidation);
      return;
    }

    if (!plUseProvisional && !plFile && (!editingPlayer || editingPlayer.isProvisionalPhoto)) {
      setPlError(
        'Sube una foto desde tu dispositivo o marca "Asignar foto provisional automáticamente".'
      );
      return;
    }

    setSavingPlayer(true);
    try {
      let finalPhotoUrl = '';
      let isProvisional = plUseProvisional;

      if (plFile) {
        const uploaded = await uploadTournamentImage(plFile, 'jugadores');
        finalPhotoUrl = uploaded.url;
        isProvisional = false;
      } else if (!plUseProvisional && editingPlayer && !editingPlayer.isProvisionalPhoto) {
        finalPhotoUrl = editingPlayer.photoUrl;
        isProvisional = false;
      } else {
        finalPhotoUrl = createProvisionalAvatarUrl(
          plName.trim(),
          jerseyNum,
          selectedTeam.primaryColor
        );
        isProvisional = true;
      }

      if (editingPlayer) {
        await onUpdatePlayer({
          ...editingPlayer,
          fullName: plName.trim(),
          jerseyNumber: jerseyNum,
          birthDate: plBirthDate,
          serviceArea: plArea.trim() || selectedTeam.serviceArea,
          photoUrl: finalPhotoUrl,
          isProvisionalPhoto: isProvisional,
        });
      } else {
        await onCreatePlayer({
          teamId: selectedTeam.id,
          championshipId: championship.id,
          fullName: plName.trim(),
          jerseyNumber: jerseyNum,
          birthDate: plBirthDate,
          serviceArea: plArea.trim() || selectedTeam.serviceArea,
          photoUrl: finalPhotoUrl,
          isProvisionalPhoto: isProvisional,
        });
      }

      setShowPlayerForm(false);
      setEditingPlayer(null);
    } catch (err) {
      setPlError(
        err instanceof Error ? err.message : 'No se pudo guardar la ficha del jugador.'
      );
    } finally {
      setSavingPlayer(false);
    }
  };

  const liveCalculatedAge = calculateAge(plBirthDate);

  return (
    <div className="space-y-6">
      {/* Encabezado y barra de búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Equipos y nómina de jugadores
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Haz clic sobre cualquier equipo para consultar su plantel, edades calculadas y datos de contacto.
          </p>
        </div>

        {adminUser && (
          <button
            type="button"
            onClick={() => {
              setTeamError(null);
              setShowNewTeamModal(true);
            }}
            className="h-11 px-5 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar equipo</span>
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por equipo, servicio/área o jugador..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/20 focus:border-[#0D5C63]"
        />
      </div>

      {/* Grid de Tarjetas de Equipos */}
      {filteredTeams.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-slate-900">
            No se encontraron equipos
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            {teams.length === 0
              ? 'El administrador aún no ha registrado equipos en este campeonato.'
              : 'Prueba con otro término de búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => {
            const roster = players.filter((p) => p.teamId === team.id);
            const provisionalCount = roster.filter((p) => p.isProvisionalPhoto).length;
            const initials = team.name
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() || '')
              .join('');

            return (
              <button
                key={team.id}
                type="button"
                onClick={() => openTeamDetail(team)}
                className="text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-[#0D5C63]/50 hover:shadow-sm transition-all flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C63]"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-12 h-12 rounded-xl text-white font-bold text-base flex items-center justify-center shrink-0"
                    style={{ backgroundColor: team.primaryColor }}
                  >
                    {initials || <Shield className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                      {team.name}
                    </h2>
                    {team.serviceArea && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {team.serviceArea}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3.5">
                  <p className="truncate">
                    <span className="text-slate-400">Resp. 1:</span>{' '}
                    <span className="font-medium text-slate-800">{team.responsible1Name}</span>
                  </p>
                  {team.responsible2Name && (
                    <p className="truncate">
                      <span className="text-slate-400">Resp. 2:</span>{' '}
                      <span className="font-medium text-slate-800">{team.responsible2Name}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {roster.length} {roster.length === 1 ? 'jugador' : 'jugadores'}
                  </span>
                  <span className="text-[#0D5C63] font-medium">
                    {provisionalCount > 0
                      ? `${provisionalCount} foto(s) provisional(es)`
                      : 'Ver detalle →'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal: Registrar Nuevo Equipo */}
      {showNewTeamModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Registrar nuevo equipo</h2>
              <button
                type="button"
                onClick={() => setShowNewTeamModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
              {teamError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                  <span>{teamError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del equipo *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ej. Emergencia FC"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Color distintivo
                </label>
                <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                  {TEAM_PALETTE_OPTIONS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setTeamColor(col.hex)}
                      title={col.label}
                      className={`w-7 h-7 rounded-lg transition-transform ${
                        teamColor === col.hex
                          ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Responsable 1 (Delegado) *
                  </label>
                  <input
                    type="text"
                    value={resp1Name}
                    onChange={(e) => setResp1Name(e.target.value)}
                    placeholder="Nombre y apellido"
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Teléfono Resp. 1
                  </label>
                  <input
                    type="tel"
                    value={resp1Phone}
                    onChange={(e) => setResp1Phone(e.target.value)}
                    placeholder="984 ..."
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Responsable 2 (Subdelegado)
                  </label>
                  <input
                    type="text"
                    value={resp2Name}
                    onChange={(e) => setResp2Name(e.target.value)}
                    placeholder="Opcional"
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Teléfono Resp. 2
                  </label>
                  <input
                    type="tel"
                    value={resp2Phone}
                    onChange={(e) => setResp2Phone(e.target.value)}
                    placeholder="984 ..."
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTeamModal(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTeam}
                  className="h-10 px-5 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F] disabled:opacity-60"
                >
                  {savingTeam ? 'Registrando...' : 'Registrar equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detallado e Intuitivo de Equipo y Jugadores */}
      {selectedTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
            {/* Cabecera Equipo */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-12 h-12 rounded-xl text-white font-bold text-base flex items-center justify-center shrink-0"
                  style={{ backgroundColor: selectedTeam.primaryColor }}
                >
                  {selectedTeam.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase() || '')
                    .join('')}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-slate-900 truncate">
                    {selectedTeam.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 truncate">
                    {selectedTeam.serviceArea ? `${selectedTeam.serviceArea} · ` : ''}
                    Resp. 1: {selectedTeam.responsible1Name}
                    {selectedTeam.responsible1Phone ? ` (${selectedTeam.responsible1Phone})` : ''}
                    {selectedTeam.responsible2Name ? ` · Resp. 2: ${selectedTeam.responsible2Name}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTeamId(null)}
                aria-label="Cerrar detalle de equipo"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navegación interna del Modal */}
            <div className="px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalTab('jugadores')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    modalTab === 'jugadores'
                      ? 'bg-white text-[#0D5C63] font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nómina de jugadores ({teamPlayers.length})
                </button>
                {adminUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalTab('datos');
                      setShowPlayerForm(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      modalTab === 'datos'
                        ? 'bg-white text-[#0D5C63] font-semibold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Editar datos del equipo
                  </button>
                )}
              </div>

              {adminUser && modalTab === 'jugadores' && !showPlayerForm && (
                <button
                  type="button"
                  onClick={openAddPlayerForm}
                  className="h-9 px-3.5 rounded-xl bg-[#0D5C63] text-white text-xs sm:text-sm font-semibold hover:bg-[#0A494F] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Agregar jugador</span>
                </button>
              )}
            </div>

            {/* Cuerpo scrollable del Modal */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {modalTab === 'jugadores' ? (
                <>
                  {/* Formulario inline de Agregar / Editar Jugador */}
                  {adminUser && showPlayerForm && (
                    <form
                      onSubmit={handleSavePlayer}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">
                          {editingPlayer
                            ? `Editar jugador: ${editingPlayer.fullName}`
                            : 'Registrar jugador en el plantel'}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPlayerForm(false);
                            setEditingPlayer(null);
                          }}
                          className="text-xs font-medium text-slate-500 hover:text-slate-800"
                        >
                          Cerrar formulario
                        </button>
                      </div>

                      {plError && (
                        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                          <span>{plError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Nombre completo del jugador *
                          </label>
                          <input
                            type="text"
                            value={plName}
                            onChange={(e) => setPlName(e.target.value)}
                            placeholder="Ej. Luis Alberto Peña"
                            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            N° Camiseta *
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={plJersey}
                            onChange={(e) => setPlJersey(e.target.value)}
                            placeholder="10"
                            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm font-mono tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Fecha de nacimiento y edad calculada *
                          </label>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="date"
                              value={plBirthDate}
                              onChange={(e) => setPlBirthDate(e.target.value)}
                              className="flex-1 h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm tabular-nums"
                            />
                            <span className="h-10 px-3 rounded-xl border border-slate-200 bg-white flex items-center text-sm font-semibold text-[#0D5C63] tabular-nums whitespace-nowrap">
                              {liveCalculatedAge !== null
                                ? `${liveCalculatedAge} años`
                                : '-- años'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Servicio o área del hospital *
                          </label>
                          <select
                            value={plArea}
                            onChange={(e) => setPlArea(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm"
                          >
                            {HOSPITAL_SERVICE_AREAS.map((area) => (
                              <option key={area} value={area}>
                                {area}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Foto del jugador (Cloudinary o Provisional) */}
                      <div className="space-y-2.5 pt-1">
                        <label className="block text-xs font-medium text-slate-700">
                          Fotografía del jugador
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            ref={playerFileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePlayerPhotoPick}
                            className="hidden"
                            id="player-photo-input"
                          />
                          <label
                            htmlFor="player-photo-input"
                            className="cursor-pointer h-10 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs sm:text-sm font-medium text-slate-700 inline-flex items-center gap-2 transition-colors"
                          >
                            <Camera className="w-4 h-4 text-[#0D5C63]" />
                            <span>Subir foto desde dispositivo</span>
                          </label>

                          <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={plUseProvisional}
                              onChange={(e) => {
                                setPlUseProvisional(e.target.checked);
                                if (e.target.checked) {
                                  setPlFile(null);
                                  setPlPreviewUrl('');
                                }
                              }}
                              className="w-4 h-4 accent-[#0D5C63] rounded"
                            />
                            <span>Asignar foto provisional hasta regularizar</span>
                          </label>
                        </div>

                        {plPreviewUrl && !plUseProvisional && (
                          <div className="flex items-center gap-3 pt-1">
                            <img
                              src={plPreviewUrl}
                              alt="Vista previa jugador"
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                            />
                            <span className="text-xs text-slate-600">
                              {plFile ? plFile.name : 'Fotografía actual'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPlayerForm(false);
                            setEditingPlayer(null);
                          }}
                          className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={savingPlayer}
                          className="h-10 px-5 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F] disabled:opacity-60"
                        >
                          {savingPlayer
                            ? 'Guardando...'
                            : editingPlayer
                            ? 'Actualizar jugador'
                            : 'Guardar jugador'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Lista de Jugadores */}
                  {teamPlayers.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 p-8 text-center">
                      <p className="text-sm font-medium text-slate-800">
                        Este equipo aún no tiene jugadores registrados.
                      </p>
                      {adminUser && (
                        <button
                          type="button"
                          onClick={openAddPlayerForm}
                          className="mt-3 h-9 px-4 rounded-xl bg-[#0D5C63] text-white text-xs font-semibold hover:bg-[#0A494F]"
                        >
                          Agregar primer jugador
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden">
                      {teamPlayers.map((player) => {
                        const age = calculateAge(player.birthDate);
                        return (
                          <div
                            key={player.id}
                            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/70 transition-colors"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                                <SafeImage
                                  src={
                                    player.photoUrl ||
                                    createProvisionalAvatarUrl(
                                      player.fullName,
                                      player.jerseyNumber,
                                      selectedTeam.primaryColor
                                    )
                                  }
                                  alt={player.fullName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-[#0D5C63] tabular-nums">
                                    #{player.jerseyNumber}
                                  </span>
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {player.fullName}
                                  </p>
                                </div>
                                <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                                  Nac: {player.birthDate}{' '}
                                  <span className="font-semibold text-slate-900">
                                    ({age !== null ? `${age} años` : '--'})
                                  </span>{' '}
                                  · {player.serviceArea}
                                </p>
                                {player.isProvisionalPhoto && (
                                  <p className="text-[11px] font-medium text-amber-700 mt-0.5">
                                    Foto provisional pendiente de regularizar
                                  </p>
                                )}
                              </div>
                            </div>

                            {adminUser && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditPlayerForm(player)}
                                  aria-label={`Editar a ${player.fullName}`}
                                  className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-[#0D5C63]" />
                                  <span className="hidden sm:inline">Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeletePlayer(player.id)}
                                  aria-label={`Eliminar a ${player.fullName}`}
                                  className="h-9 w-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* Tab 2: Editar datos del equipo */
                <form onSubmit={handleSaveTeamEdit} className="space-y-4">
                  {editTeamMsg && (
                    <div className="flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200 p-3 text-sm text-teal-900">
                      <CheckCircle2 className="w-4 h-4 text-[#0D5C63] shrink-0" />
                      <span>{editTeamMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nombre del equipo
                      </label>
                      <input
                        type="text"
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Servicio o área
                      </label>
                      <select
                        value={editTeamArea}
                        onChange={(e) => setEditTeamArea(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                      >
                        {HOSPITAL_SERVICE_AREAS.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Color institucional del equipo
                    </label>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {TEAM_PALETTE_OPTIONS.map((col) => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => setEditTeamColor(col.hex)}
                          className={`w-8 h-8 rounded-lg ${
                            editTeamColor === col.hex
                              ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: col.hex }}
                          title={col.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Responsable 1
                      </label>
                      <input
                        type="text"
                        value={editResp1Name}
                        onChange={(e) => setEditResp1Name(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Teléfono Resp. 1
                      </label>
                      <input
                        type="tel"
                        value={editResp1Phone}
                        onChange={(e) => setEditResp1Phone(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Responsable 2
                      </label>
                      <input
                        type="text"
                        value={editResp2Name}
                        onChange={(e) => setEditResp2Name(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Teléfono Resp. 2
                      </label>
                      <input
                        type="tel"
                        value={editResp2Phone}
                        onChange={(e) => setEditResp2Phone(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                    {!confirmDeleteTeam ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTeam(true)}
                        className="h-10 px-3.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Eliminar equipo
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-red-700">
                          ¿Eliminar equipo y sus jugadores?
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteTeam(selectedTeam.id);
                            setSelectedTeamId(null);
                          }}
                          className="h-9 px-3 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                        >
                          Sí, eliminar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTeam(false)}
                          className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                        >
                          No
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={savingTeam}
                      className="h-10 px-5 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F] disabled:opacity-60"
                    >
                      {savingTeam ? 'Guardando...' : 'Guardar cambios del equipo'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
