'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, FolderPlus, Trophy, X } from 'lucide-react';
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
  isPostLoginPrompt = false,
}: ChampionshipModalProps) {
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

  const handleCreate = async (e: React.FormEvent) => {
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
        (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setError('Ya existe un campeonato registrado con ese nombre. Elige un nombre diferente.');
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
      });
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear el campeonato. Intenta nuevamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="championship-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6">
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#0D5C63] mb-1">
              <Trophy className="w-4 h-4" />
              <span>
                {isPostLoginPrompt
                  ? 'Sesión de administrador iniciada'
                  : 'Gestión de campeonatos y ligas'}
              </span>
            </div>
            <h2
              id="championship-modal-title"
              className="text-xl font-bold text-slate-900"
            >
              Crear o seleccionar campeonato
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Cada campeonato encapsula sus propios equipos, jugadores, programación, noticias y tabla de posiciones.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {existingChampionships.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2.5">
                Continuar gestionando un campeonato existente
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {existingChampionships.map((c) => {
                  const isActive = c.id === activeChampionshipId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectExisting(c.id);
                        onClose();
                      }}
                      className={`text-left p-3.5 rounded-xl border transition-colors ${
                        isActive
                          ? 'border-[#0D5C63] bg-teal-50/70'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 line-clamp-1">
                          {c.name}
                        </span>
                        {isActive && (
                          <CheckCircle2 className="w-4 h-4 text-[#0D5C63] shrink-0 mt-0.5" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.sport} · Temporada {c.seasonYear} · {c.winPoints}/{c.drawPoints}/{c.lossPoints} pts
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#0D5C63]" />
              <span>Crear nuevo campeonato o liga</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del campeonato o liga *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Campeonato Aniversario U.E. 410 — Fulbito Damas 2026"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/25 focus:border-[#0D5C63]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Disciplina
                  </label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/25 focus:border-[#0D5C63]"
                  >
                    {SPORTS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Año / Edición
                  </label>
                  <input
                    type="number"
                    min={2024}
                    max={2035}
                    value={seasonYear}
                    onChange={(e) => setSeasonYear(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/25 focus:border-[#0D5C63]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cupos a Liguilla
                  </label>
                  <select
                    value={liguillaQualifiers}
                    onChange={(e) => setLiguillaQualifiers(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/25 focus:border-[#0D5C63]"
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
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Pts. Victoria
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={winPoints}
                    onChange={(e) => setWinPoints(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm tabular-nums text-slate-900 focus:outline-none focus:border-[#0D5C63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Pts. Empate
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={drawPoints}
                    onChange={(e) => setDrawPoints(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm tabular-nums text-slate-900 focus:outline-none focus:border-[#0D5C63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Pts. Derrota
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={lossPoints}
                    onChange={(e) => setLossPoints(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm tabular-nums text-slate-900 focus:outline-none focus:border-[#0D5C63]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción breve (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Torneo interno por el aniversario institucional del Hospital de Quillabamba."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/25 focus:border-[#0D5C63]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 px-5 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F] disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {saving ? 'Creando...' : 'Crear campeonato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
