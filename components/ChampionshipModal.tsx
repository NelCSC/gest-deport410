'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  FolderPlus,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { Championship } from '@/lib/types';

interface ChampionshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingChampionships: Championship[];
  activeChampionshipId: string;
  onSelectExisting: (id: string) => void;
  onCreateChampionship: (
    data: Omit<Championship, 'id' | 'createdAt'>
  ) => Promise<void>;
  onUpdateChampionship: (champ: Championship) => Promise<void>;
  onDeleteChampionship: (championshipId: string) => Promise<void>;
  isPostLoginPrompt?: boolean;
}

const SPORTS_OPTIONS = [
  'Fulbito',
  'Fútbol 7',
  'Fútbol 11',
  'Vóley Mixto',
  'Vóley Damas',
  'Básquet Institucional',
];

export default function ChampionshipModal({
  isOpen,
  onClose,
  existingChampionships,
  activeChampionshipId,
  onSelectExisting,
  onCreateChampionship,
  onUpdateChampionship,
  onDeleteChampionship,
  isPostLoginPrompt = false,
}: ChampionshipModalProps) {
  useLockBodyScroll(isOpen);

  const [editingChamp, setEditingChamp] = useState<Championship | null>(null);
  const [confirmDeleteChamp, setConfirmDeleteChamp] = useState<Championship | null>(null);

  const [name, setName] = useState('');
  const [sport, setSport] = useState('Fulbito');
  const [seasonYear, setSeasonYear] = useState(2026);
  const [description, setDescription] = useState('');
  const [winPoints, setWinPoints] = useState(3);
  const [drawPoints, setDrawPoints] = useState(1);
  const [lossPoints, setLossPoints] = useState(0);
  const [liguillaQualifiers, setLiguillaQualifiers] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingChamp(null);
    setName('');
    setSport('Fulbito');
    setSeasonYear(2026);
    setDescription('');
    setWinPoints(3);
    setDrawPoints(1);
    setLossPoints(0);
    setLiguillaQualifiers(4);
    setError(null);
  };

  const startEditChampionship = (champ: Championship) => {
    setConfirmDeleteChamp(null);
    setEditingChamp(champ);
    setName(champ.name);
    setSport(champ.sport);
    setSeasonYear(champ.seasonYear);
    setDescription(champ.description);
    setWinPoints(champ.winPoints);
    setDrawPoints(champ.drawPoints);
    setLossPoints(champ.lossPoints);
    setLiguillaQualifiers(champ.liguillaQualifiers);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 5) {
      setError(
        'El nombre del campeonato debe tener al menos 5 caracteres (ej. Copa Aniversario U.E. 410 - Fulbito).'
      );
      return;
    }
    if (
      existingChampionships.some(
        (c) =>
          c.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
          c.id !== editingChamp?.id
      )
    ) {
      setError('Ya existe otro campeonato registrado con ese nombre.');
      return;
    }
    if (winPoints <= drawPoints || drawPoints < lossPoints || lossPoints < 0) {
      setError(
        'Las reglas de puntaje deben cumplir: Victoria > Empate >= Derrota >= 0.'
      );
      return;
    }

    setSaving(true);
    try {
      if (editingChamp) {
        await onUpdateChampionship({
          ...editingChamp,
          name: trimmedName,
          sport,
          seasonYear,
          description:
            description.trim() ||
            `Campeonato institucional de ${sport} · U.E. 410 Hospital de Quillabamba.`,
          winPoints,
          drawPoints,
          lossPoints,
          liguillaQualifiers,
        });
        resetForm();
      } else {
        await onCreateChampionship({
          name: trimmedName,
          sport,
          seasonYear,
          description:
            description.trim() ||
            `Campeonato institucional de ${sport} · U.E. 410 Hospital de Quillabamba.`,
          winPoints,
          drawPoints,
          lossPoints,
          liguillaQualifiers,
          status: 'activo',
          heroImageUrl: '/images/hero-hospital-stadium.jpg',
          heroImagePosition: '50% 50%',
        });
        resetForm();
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la información del campeonato.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteChamp) return;
    setSaving(true);
    setError(null);
    try {
      await onDeleteChampionship(confirmDeleteChamp.id);
      if (editingChamp?.id === confirmDeleteChamp.id) {
        resetForm();
      }
      setConfirmDeleteChamp(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el campeonato.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090E17]/80 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="championship-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#111827] border border-white/[0.08] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-start justify-between gap-4 bg-[#0F172A] shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#10B981] mb-1">
              <Trophy className="w-4 h-4" />
              <span>
                {isPostLoginPrompt
                  ? 'Sesión de administrador iniciada'
                  : 'Gestión de campeonatos y ligas'}
              </span>
            </div>
            <h2
              id="championship-modal-title"
              className="text-xl font-bold text-[#F8FAFC]"
            >
              Crear, editar o seleccionar campeonato
            </h2>
            <p className="text-sm text-[#94A3B8] mt-0.5">
              Cada campeonato encapsula sus propios equipos, jugadores, programación, noticias y tabla de posiciones.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setConfirmDeleteChamp(null);
              onClose();
            }}
            aria-label="Cerrar modal"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:bg-white/[0.06] hover:text-[#F8FAFC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto overscroll-contain flex-1">
          {confirmDeleteChamp && (
            <div
              role="alertdialog"
              aria-labelledby="delete-champ-warning-title"
              className="rounded-2xl border border-rose-500/40 bg-rose-950/50 p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3
                    id="delete-champ-warning-title"
                    className="text-sm font-bold text-rose-200"
                  >
                    Advertencia: ¿Eliminar campeonato permanentemente?
                  </h3>
                  <p className="text-xs sm:text-sm text-rose-200/90 mt-1 leading-relaxed">
                    Estás a punto de eliminar{' '}
                    <strong className="text-white">&ldquo;{confirmDeleteChamp.name}&rdquo;</strong>. Esta acción borrará todos sus equipos, nóminas de jugadores, programación, resultados, amonestaciones y noticias asociadas, y no se puede deshacer.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteChamp(null)}
                  disabled={saving}
                  className="h-9 px-3.5 rounded-xl border border-white/[0.12] bg-[#1E293B] text-xs sm:text-sm font-medium text-[#F8FAFC] hover:bg-[#273549]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-semibold hover:bg-rose-500 disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{saving ? 'Eliminando...' : 'Sí, eliminar campeonato'}</span>
                </button>
              </div>
            </div>
          )}

          {existingChampionships.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#F8FAFC] mb-2.5">
                Campeonatos registrados ({existingChampionships.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {existingChampionships.map((c) => {
                  const isActive = c.id === activeChampionshipId;
                  const isBeingEdited = editingChamp?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl border transition-colors flex flex-col justify-between gap-2.5 ${
                        isBeingEdited
                          ? 'border-[#06B6D4] bg-[#06B6D4]/10'
                          : isActive
                          ? 'border-[#10B981]/60 bg-[#10B981]/10'
                          : 'border-white/[0.08] bg-[#0F172A] hover:border-white/20'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectExisting(c.id);
                          onClose();
                        }}
                        className="text-left w-full"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-[#F8FAFC] line-clamp-1">
                            {c.name}
                          </span>
                          {isActive && (
                            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                          )}
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-1 tabular-nums">
                          {c.sport} · {c.seasonYear} · {c.winPoints}/{c.drawPoints}/{c.lossPoints} pts
                        </p>
                      </button>

                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => startEditChampionship(c)}
                          title="Editar datos del campeonato"
                          className="h-8 px-2.5 rounded-lg border border-white/[0.1] bg-[#1E293B] hover:bg-[#273549] text-xs font-medium text-[#F8FAFC] inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#06B6D4]" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteChamp(c);
                            setError(null);
                          }}
                          title="Eliminar campeonato"
                          className="h-8 px-2.5 rounded-lg border border-rose-500/30 bg-rose-950/30 hover:bg-rose-950/60 text-xs font-medium text-rose-300 inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-white/[0.08] pt-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
                {editingChamp ? (
                  <>
                    <Edit3 className="w-4 h-4 text-[#06B6D4]" />
                    <span>Editando: {editingChamp.name}</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4 text-[#10B981]" />
                    <span>Crear nuevo campeonato o liga</span>
                  </>
                )}
              </h3>
              {editingChamp && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-medium text-[#06B6D4] hover:text-[#22D3EE] underline underline-offset-2"
                >
                  Cancelar edición (crear nuevo)
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-sm text-rose-200"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1">
                  Nombre del campeonato o liga *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Campeonato Aniversario U.E. 410 — Fulbito Damas 2026"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1">
                    Disciplina
                  </label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]"
                  >
                    {SPORTS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1">
                    Año / Edición
                  </label>
                  <input
                    type="number"
                    min={2024}
                    max={2035}
                    value={seasonYear}
                    onChange={(e) => setSeasonYear(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm tabular-nums text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1">
                    Cupos a Liguilla
                  </label>
                  <select
                    value={liguillaQualifiers}
                    onChange={(e) => setLiguillaQualifiers(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]"
                  >
                    <option value={2}>Top 2</option>
                    <option value={4}>Top 4</option>
                    <option value={6}>Top 6</option>
                    <option value={8}>Top 8</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    Pts. Victoria
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={winPoints}
                    onChange={(e) => setWinPoints(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    Pts. Empate
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={drawPoints}
                    onChange={(e) => setDrawPoints(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                    Pts. Derrota
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={lossPoints}
                    onChange={(e) => setLossPoints(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm tabular-nums text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-1">
                  Descripción breve (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Torneo interno por el aniversario institucional del Hospital de Quillabamba."
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  className="h-11 px-4 rounded-xl border border-white/[0.1] bg-[#1E293B] text-sm font-medium text-[#F8FAFC] hover:bg-[#273549] transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 px-5 rounded-xl bg-[#10B981] text-[#022C22] text-sm font-bold hover:bg-[#34D399] disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {saving
                    ? 'Guardando...'
                    : editingChamp
                    ? 'Guardar cambios'
                    : 'Crear campeonato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
