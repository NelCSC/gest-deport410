'use client';

import React, { useMemo, useState } from 'react';
import { Award, Search } from 'lucide-react';
import { computeTopScorers } from '@/lib/tournament-utils';
import { Championship, Match, MatchGoal, Player, Team } from '@/lib/types';
import SafeImage from './SafeImage';

interface GoleadoresViewProps {
  championship: Championship;
  teams: Team[];
  players: Player[];
  matches: Match[];
  matchGoals: MatchGoal[];
}

type ScorersStageFilter = 'todas' | 'todos_contra_todos' | 'fase_final';

const STAGE_FILTER_OPTIONS: { id: ScorersStageFilter; label: string }[] = [
  { id: 'todas', label: 'Todo el torneo' },
  { id: 'todos_contra_todos', label: 'Todos contra Todos' },
  { id: 'fase_final', label: 'Fase Final' },
];

export default function GoleadoresView({
  championship,
  teams,
  players,
  matches,
  matchGoals,
}: GoleadoresViewProps) {
  const [stageFilter, setStageFilter] = useState<ScorersStageFilter>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  const allScorers = useMemo(
    () => computeTopScorers(players, teams, matches, matchGoals, stageFilter),
    [players, teams, matches, matchGoals, stageFilter]
  );

  const filteredScorers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allScorers;
    return allScorers.filter(
      (row) =>
        row.player.fullName.toLowerCase().includes(q) ||
        row.team.name.toLowerCase().includes(q) ||
        String(row.player.jerseyNumber) === q
    );
  }, [allScorers, searchQuery]);

  const totalGoalsScored = useMemo(
    () => allScorers.reduce((sum, row) => sum + row.goals, 0),
    [allScorers]
  );

  const leader = allScorers[0] || null;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            Tabla de goleadores
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Ranking oficial sincronizado al término de cada jornada en {championship.name}, ordenado de mayor a menor cantidad de goles.
          </p>
        </div>

        {/* Resumen limpio sin píldoras */}
        {allScorers.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-[#94A3B8]">
            <span>
              Total goles:{' '}
              <strong className="font-mono tabular-nums text-[#F8FAFC]">
                {totalGoalsScored}
              </strong>
            </span>
            <span className="text-white/20" aria-hidden="true">
              ·
            </span>
            <span>
              Goleadores:{' '}
              <strong className="font-mono tabular-nums text-[#F8FAFC]">
                {allScorers.length}
              </strong>
            </span>
            {leader && (
              <>
                <span className="text-white/20" aria-hidden="true">
                  ·
                </span>
                <span>
                  Líder:{' '}
                  <strong className="text-[#10B981]">
                    {leader.player.fullName} ({leader.goals})
                  </strong>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filtros: Etapa y Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#111827] border border-white/[0.08] rounded-xl overflow-x-auto w-full sm:w-fit">
          {STAGE_FILTER_OPTIONS.map((opt) => {
            const isActive = stageFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStageFilter(opt.id)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#10B981] text-[#022C22] font-bold'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar jugador o equipo..."
            aria-label="Buscar goleador o equipo"
            className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-white/[0.1] bg-[#111827] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:border-[#10B981]"
          />
        </div>
      </div>

      {/* Tabla de Goleadores */}
      {allScorers.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111827] p-10 text-center">
          <Award className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
          <h3 className="text-base font-semibold text-[#F8FAFC]">
            Aún no hay goles registrados en jornadas finalizadas
          </h3>
          <p className="text-sm text-[#94A3B8] mt-1 max-w-md mx-auto">
            Cuando el administrador registre los resultados finales y los anotadores de cada encuentro en Programación, la tabla se actualizará automáticamente.
          </p>
        </div>
      ) : filteredScorers.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111827] p-8 text-center">
          <p className="text-sm font-medium text-[#F8FAFC]">
            No se encontraron goleadores que coincidan con &ldquo;{searchQuery}&rdquo;.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111827] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[540px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0F172A] text-xs font-semibold text-[#94A3B8]">
                  <th className="py-3.5 pl-5 pr-2 w-14">#</th>
                  <th className="py-3.5 px-3">Jugador</th>
                  <th className="py-3.5 px-3">Equipo</th>
                  <th
                    className="py-3.5 px-3 text-right tabular-nums"
                    title="Partidos finalizados donde anotó"
                  >
                    Jornadas c/ gol
                  </th>
                  <th className="py-3.5 pl-3 pr-5 text-right tabular-nums text-[#F8FAFC]">
                    Goles
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {filteredScorers.map((row) => {
                  const isLeader = row.rank === 1;
                  return (
                    <tr
                      key={row.player.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isLeader ? 'bg-[#10B981]/[0.06]' : ''
                      }`}
                    >
                      <td className="py-3.5 pl-5 pr-2 font-mono tabular-nums font-bold">
                        <span
                          className={
                            isLeader ? 'text-[#10B981]' : 'text-[#94A3B8]'
                          }
                        >
                          {row.rank}°
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 aspect-square rounded-[10px] overflow-hidden bg-[#1E293B] border border-[#10B981]/30 shrink-0">
                            <SafeImage
                              src={row.player.photoUrl}
                              alt={row.player.fullName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#F8FAFC] truncate">
                              {row.player.fullName}
                            </p>
                            <p className="text-xs text-[#94A3B8] font-mono tabular-nums">
                              Dorsal #{row.player.jerseyNumber}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-[4px] shrink-0 ring-1 ring-white/20"
                            style={{ backgroundColor: row.team.primaryColor }}
                          />
                          <span className="font-medium text-[#CBD5E1] truncate">
                            {row.team.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-[#CBD5E1]">
                        {row.matchesWithGoals}
                      </td>

                      <td className="py-3.5 pl-3 pr-5 text-right font-mono tabular-nums font-extrabold text-base text-[#10B981]">
                        {row.goals}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3.5 bg-[#0F172A] border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
            <span>
              Ordenado de forma descendente según la suma de goles anotados por jugador.
            </span>
            <span>
              Sincronizado con los encuentros finalizados de {championship.name}.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
