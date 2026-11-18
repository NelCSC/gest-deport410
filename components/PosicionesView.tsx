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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            Tabla de posiciones
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Clasificación actualizada en tiempo real al finalizar cada encuentro de la fase Todos contra Todos.
          </p>
        </div>

        {adminUser && !editingRules && (
          <button
            type="button"
            onClick={openEditor}
            className="h-10 px-4 rounded-xl border border-white/[0.1] bg-[#111827] text-sm font-semibold text-[#F8FAFC] hover:bg-[#1E293B] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Settings2 className="w-4 h-4 text-[#10B981]" />
            <span>Configurar puntaje</span>
          </button>
        )}
      </div>

      {/* Reglas de puntaje vigentes */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111827] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-[#94A3B8]">
            <span>
              Partido ganado:{' '}
              <strong className="font-mono tabular-nums text-[#F8FAFC]">
                {championship.winPoints} pts
              </strong>
            </span>
            <span className="text-white/20" aria-hidden="true">·</span>
            <span>
              Empate:{' '}
              <strong className="font-mono tabular-nums text-[#F8FAFC]">
                {championship.drawPoints} {championship.drawPoints === 1 ? 'pt' : 'pts'}
              </strong>
            </span>
            <span className="text-white/20" aria-hidden="true">·</span>
            <span>
              Partido perdido:{' '}
              <strong className="font-mono tabular-nums text-[#F8FAFC]">
                {championship.lossPoints} pts
              </strong>
            </span>
            <span className="text-white/20" aria-hidden="true">·</span>
            <span>
              Clasifican a Liguilla:{' '}
              <strong className="font-mono tabular-nums text-[#10B981]">
                Top {championship.liguillaQualifiers}
              </strong>
            </span>
          </div>

          {ruleSaved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tabla recalculada con los nuevos puntajes</span>
            </span>
          )}
        </div>

        {/* Panel editable de puntos para Admin */}
        {adminUser && editingRules && (
          <form
            onSubmit={handleSaveRules}
            className="mt-4 pt-4 border-t border-white/[0.08] space-y-4"
          >
            {ruleError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-sm text-rose-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                <span>{ruleError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                  Puntos por victoria
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={winPoints}
                  onChange={(e) => setWinPoints(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm text-[#F8FAFC] font-mono tabular-nums focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                  Puntos por empate
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={drawPoints}
                  onChange={(e) => setDrawPoints(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm text-[#F8FAFC] font-mono tabular-nums focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                  Puntos por derrota
                </label>
                <input
                  type="number"
                  min={0}
                  max={3}
                  value={lossPoints}
                  onChange={(e) => setLossPoints(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm text-[#F8FAFC] font-mono tabular-nums focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                  Cupos a Liguilla
                </label>
                <select
                  value={qualifiers}
                  onChange={(e) => setQualifiers(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
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
                className="h-9 px-4 rounded-xl border border-white/[0.1] bg-[#1E293B] text-xs sm:text-sm font-medium text-[#F8FAFC] hover:bg-[#273549]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-4 rounded-xl bg-[#10B981] text-[#022C22] text-xs sm:text-sm font-bold hover:bg-[#34D399] disabled:opacity-60"
              >
                {saving ? 'Aplicando...' : 'Aplicar y recalcular'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Tabla principal de Posiciones */}
      {standings.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111827] p-10 text-center">
          <Trophy className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
          <h3 className="text-base font-semibold text-[#F8FAFC]">
            No hay equipos inscritos en este campeonato
          </h3>
          <p className="text-sm text-[#94A3B8] mt-1">
            Registra equipos en la pestaña Equipos para visualizar la tabla de posiciones.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111827] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0F172A] text-xs font-semibold text-[#94A3B8]">
                  <th className="py-3.5 pl-5 pr-2 w-12">#</th>
                  <th className="py-3.5 px-3">Equipo</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Partidos Jugados">PJ</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Partidos Ganados">PG</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Partidos Empatados">PE</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Partidos Perdidos">PP</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Goles a Favor">GF</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Goles en Contra">GC</th>
                  <th className="py-3.5 px-2.5 text-right tabular-nums" title="Diferencia de Goles">DG</th>
                  <th className="py-3.5 px-3 text-right tabular-nums text-[#F8FAFC]">PTS</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Últimos 5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {standings.map((row) => {
                  const isQualified = row.position <= championship.liguillaQualifiers;
                  return (
                    <tr
                      key={row.team.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isQualified ? 'bg-[#10B981]/[0.06]' : ''
                      }`}
                    >
                      <td className="py-3.5 pl-5 pr-2 font-mono tabular-nums font-bold">
                        <span
                          className={
                            isQualified ? 'text-[#10B981]' : 'text-[#94A3B8]'
                          }
                        >
                          {row.position}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-3 h-3 rounded-[4px] shrink-0 ring-1 ring-white/20"
                            style={{ backgroundColor: row.team.primaryColor }}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-[#F8FAFC] truncate">
                              {row.team.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-[#CBD5E1]">
                        {row.played}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-[#CBD5E1]">
                        {row.won}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-[#CBD5E1]">
                        {row.drawn}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-[#CBD5E1]">
                        {row.lost}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-[#94A3B8]">
                        {row.goalsFor}
                      </td>
                      <td className="py-3.5 px-2.5 text-right font-mono tabular-nums text-[#94A3B8]">
                        {row.goalsAgainst}
                      </td>
                      <td
                        className={`py-3.5 px-2.5 text-right font-mono tabular-nums font-medium ${
                          row.goalDifference > 0
                            ? 'text-[#10B981]'
                            : row.goalDifference < 0
                            ? 'text-rose-400'
                            : 'text-[#94A3B8]'
                        }`}
                      >
                        {row.goalDifference > 0
                          ? `+${row.goalDifference}`
                          : row.goalDifference}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums font-extrabold text-base text-[#10B981]">
                        {row.points}
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right">
                        <div className="inline-flex items-center justify-end gap-1 font-mono text-xs tabular-nums">
                          {row.recentForm.length === 0 ? (
                            <span className="text-[#64748B]">-</span>
                          ) : (
                            row.recentForm.map((res, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 rounded flex items-center justify-center font-bold ${
                                  res === 'G'
                                    ? 'bg-[#10B981]/20 text-[#10B981]'
                                    : res === 'E'
                                    ? 'bg-[#1E293B] text-[#94A3B8]'
                                    : 'bg-rose-500/20 text-rose-400'
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

          <div className="px-5 py-3.5 bg-[#0F172A] border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
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
