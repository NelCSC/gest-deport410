'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Settings2, Trophy } from 'lucide-react';
import { AdminUser, Championship, StandingRow } from '@/lib/types';

interface PosicionesViewProps {
  championship: Championship;
  standings: StandingRow[];
  adminUser: AdminUser | null;
  onUpdateChampionshipRules: (updated: Championship) => Promise<void>;
}

export default function PosicionesView({
  championship,
  standings,
  adminUser,
  onUpdateChampionshipRules,
}: PosicionesViewProps) {
  const [editingRules, setEditingRules] = useState(false);
  const [winPoints, setWinPoints] = useState(championship.winPoints);
  const [drawPoints, setDrawPoints] = useState(championship.drawPoints);
  const [lossPoints, setLossPoints] = useState(championship.lossPoints);
  const [qualifiers, setQualifiers] = useState(championship.liguillaQualifiers);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleSaved, setRuleSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEditor = () => {
    setWinPoints(championship.winPoints);
    setDrawPoints(championship.drawPoints);
    setLossPoints(championship.lossPoints);
    setQualifiers(championship.liguillaQualifiers);
    setRuleError(null);
    setRuleSaved(false);
    setEditingRules(true);
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setRuleError(null);
    setRuleSaved(false);

    if (
      !Number.isInteger(winPoints) ||
      !Number.isInteger(drawPoints) ||
      !Number.isInteger(lossPoints)
    ) {
      setRuleError('Ingresa valores numéricos enteros para el puntaje.');
      return;
    }
    if (winPoints < 1 || drawPoints < 0 || lossPoints < 0) {
      setRuleError(
        'La victoria debe otorgar al menos 1 punto y empate/derrota no pueden ser negativos.'
      );
      return;
    }
    if (winPoints <= drawPoints || drawPoints < lossPoints) {
      setRuleError(
        'Coherencia deportiva: Victoria debe valer más que Empate, y Empate mayor o igual que Derrota.'
      );
      return;
    }

    setSaving(true);
    try {
      await onUpdateChampionshipRules({
        ...championship,
        winPoints,
        drawPoints,
        lossPoints,
        liguillaQualifiers: qualifiers,
      });
      setEditingRules(false);
      setRuleSaved(true);
      setTimeout(() => setRuleSaved(false), 3500);
    } catch (err) {
      setRuleError(
        err instanceof Error ? err.message : 'No se pudieron actualizar las reglas.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tabla de posiciones
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Clasificación actualizada en tiempo real al finalizar cada encuentro de la fase Todos contra Todos.
          </p>
        </div>

        {adminUser && !editingRules && (
          <button
            type="button"
            onClick={openEditor}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Settings2 className="w-4 h-4 text-[#0D5C63]" />
            <span>Configurar puntaje</span>
          </button>
        )}
      </div>

      {/* Reglas de puntaje vigentes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-700">
            <span>
              Partido ganado:{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {championship.winPoints} pts
              </strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>
              Empate:{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {championship.drawPoints} {championship.drawPoints === 1 ? 'pt' : 'pts'}
              </strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>
              Partido perdido:{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {championship.lossPoints} pts
              </strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>
              Clasifican a Liguilla:{' '}
              <strong className="font-mono tabular-nums text-[#0D5C63]">
                Top {championship.liguillaQualifiers}
              </strong>
            </span>
          </div>

          {ruleSaved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tabla recalculada con los nuevos puntajes</span>
            </span>
          )}
        </div>

        {/* Panel editable de puntos para Admin */}
        {adminUser && editingRules && (
          <form
            onSubmit={handleSaveRules}
            className="mt-4 pt-4 border-t border-slate-200 space-y-4"
          >
            {ruleError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <span>{ruleError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Puntos por victoria
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={winPoints}
                  onChange={(e) => setWinPoints(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Puntos por empate
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={drawPoints}
                  onChange={(e) => setDrawPoints(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Puntos por derrota
                </label>
                <input
                  type="number"
                  min={0}
                  max={3}
                  value={lossPoints}
                  onChange={(e) => setLossPoints(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Cupos a Liguilla
                </label>
                <select
                  value={qualifiers}
                  onChange={(e) => setQualifiers(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value={2}>Top 2</option>
                  <option value={4}>Top 4</option>
                  <option value={6}>Top 6</option>
                  <option value={8}>Top 8</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingRules(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-4 rounded-xl bg-[#0D5C63] text-white text-xs sm:text-sm font-semibold hover:bg-[#0A494F] disabled:opacity-60"
              >
                {saving ? 'Aplicando...' : 'Aplicar y recalcular'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Tabla principal de Posiciones */}
      {standings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Trophy className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-slate-900">
            No hay equipos inscritos en este campeonato
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Registra equipos en la pestaña Equipos para visualizar la tabla de posiciones.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="py-3.5 pl-5 pr-2 w-12">#</th>
                  <th className="py-3.5 px-3">Equipo / Área</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Partidos Jugados">PJ</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Partidos Ganados">PG</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Partidos Empatados">PE</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Partidos Perdidos">PP</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Goles a Favor">GF</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Goles en Contra">GC</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Diferencia de Goles">DG</th>
                  <th className="py-3.5 px-3 text-right tabular-nums text-slate-900">PTS</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Últimos 5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {standings.map((row) => {
                  const isQualified = row.position <= championship.liguillaQualifiers;
                  return (
                    <tr
                      key={row.team.id}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isQualified ? 'bg-emerald-50/25' : ''
                      }`}
                    >
                      <td className="py-3.5 pl-5 pr-2 font-mono tabular-nums font-bold">
                        <span
                          className={
                            isQualified ? 'text-[#0D5C63]' : 'text-slate-500'
                          }
                        >
                          {row.position}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: row.team.primaryColor }}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {row.team.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {row.team.serviceArea}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-slate-700">
                        {row.played}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-slate-700">
                        {row.won}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-slate-700">
                        {row.drawn}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-slate-700">
                        {row.lost}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-slate-600">
                        {row.goalsFor}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-slate-600">
                        {row.goalsAgainst}
                      </td>
                      <td
                        className={`py-3.5 px-2.5 text-right font-mono tabular-nums font-medium ${
                          row.goalDifference > 0
                            ? 'text-emerald-700'
                            : row.goalDifference < 0
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {row.goalDifference > 0
                          ? `+${row.goalDifference}`
                          : row.goalDifference}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums font-extrabold text-base text-[#0D5C63]">
                        {row.points}
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right">
                        <div className="inline-flex items-center justify-end gap-1 font-mono text-xs tabular-nums">
                          {row.recentForm.length === 0 ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            row.recentForm.map((res, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 rounded flex items-center justify-center font-bold ${
                                  res === 'G'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : res === 'E'
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                                title={
                                  res === 'G'
                                    ? 'Ganado'
                                    : res === 'E'
                                    ? 'Empatado'
                                    : 'Perdido'
                                }
                              >
                                {res}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Posiciones 1 al {championship.liguillaQualifiers} clasifican a la Liguilla / Fase Final.
            </span>
            <span>
              Criterio de desempate: Puntos · Diferencia de goles (DG) · Goles a favor (GF).
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
