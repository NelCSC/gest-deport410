'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FolderPlus, ShieldCheck, Trophy } from 'lucide-react';
import {
  dbCreateChampionship,
  dbCreateMatches,
  dbCreateNewsPost,
  dbCreatePlayer,
  dbCreateTeam,
  dbDeleteMatch,
  dbDeleteNewsPost,
  dbDeletePlayer,
  dbDeleteTeam,
  dbUpdateChampionship,
  dbUpdateMatch,
  dbUpdatePlayer,
  dbUpdateTeam,
  fetchAllDataFromSupabase,
  getSupabaseClient,
  isSupabaseConfigured,
  loadLocalAdminSession,
  loadLocalSnapshot,
  saveLocalAdminSession,
  saveLocalSnapshot,
} from '@/lib/supabase';
import { computeStandings } from '@/lib/tournament-utils';
import {
  AdminUser,
  AppPage,
  AppStateSnapshot,
  Championship,
  Match,
  NewsPost,
  Player,
  Team,
} from '@/lib/types';
import ChampionshipModal from './ChampionshipModal';
import EquiposView from './EquiposView';
import HeaderAndNav from './HeaderAndNav';
import InicioView from './InicioView';
import LoginModal from './LoginModal';
import PosicionesView from './PosicionesView';
import ProgramacionView from './ProgramacionView';

export default function GestDeportApp() {
  const [snapshot, setSnapshot] = useState<AppStateSnapshot | null>(null);
  const [activePage, setActivePage] = useState<AppPage>('inicio');
  const [activeChampionshipId, setActiveChampionshipId] = useState<string>('');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChampionshipModal, setShowChampionshipModal] = useState(false);
  const [isPostLoginPrompt, setIsPostLoginPrompt] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  const refreshData = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const remote = await fetchAllDataFromSupabase();
        if (remote) {
          setSnapshot(remote);
          setActiveChampionshipId((prev) =>
            prev && remote.championships.some((c) => c.id === prev)
              ? prev
              : remote.championships[0]?.id || ''
          );
          return;
        }
      } catch {
        // Fallback silencioso a datos locales si Supabase aún no tiene tablas creadas
      }
    }

    const local = loadLocalSnapshot();
    setSnapshot(local);
    setActiveChampionshipId((prev) =>
      prev && local.championships.some((c) => c.id === prev)
        ? prev
        : local.championships[0]?.id || ''
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (mounted) {
        void refreshData();
      }
    });

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured) {
      client.auth.getSession().then(({ data }) => {
        if (mounted && data.session?.user) {
          setAdminUser({
            id: data.session.user.id,
            email: data.session.user.email || '',
            name:
              String(data.session.user.user_metadata?.full_name || '') ||
              'Administrador U.E. 410',
            mode: 'supabase',
          });
        }
      });

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setAdminUser({
            id: session.user.id,
            email: session.user.email || '',
            name:
              String(session.user.user_metadata?.full_name || '') ||
              'Administrador U.E. 410',
            mode: 'supabase',
          });
        } else {
          setAdminUser(null);
        }
      });

      // Suscripción en tiempo real a cambios de la base de datos
      const realtimeChannel = client
        .channel('gest-deport410-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          () => refreshData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'teams' },
          () => refreshData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players' },
          () => refreshData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'news_posts' },
          () => refreshData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'championships' },
          () => refreshData()
        )
        .subscribe();

      return () => {
        mounted = false;
        subscription.unsubscribe();
        client.removeChannel(realtimeChannel);
      };
    } else {
      Promise.resolve().then(() => {
        if (!mounted) return;
        const localAdmin = loadLocalAdminSession();
        if (localAdmin) setAdminUser(localAdmin);
      });
      return () => {
        mounted = false;
      };
    }
  }, [refreshData]);

  const updateSnapshot = useCallback(
    (updater: (prev: AppStateSnapshot) => AppStateSnapshot) => {
      setSnapshot((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        if (!isSupabaseConfigured) {
          saveLocalSnapshot(next);
        }
        return next;
      });
    },
    []
  );

  const handleLoginSuccess = (user: AdminUser) => {
    setAdminUser(user);
    if (user.mode === 'local') {
      saveLocalAdminSession(user);
    }
    setShowLoginModal(false);
    // Requerimiento explícito: después de logear, pedir crear o elegir campeonato
    setIsPostLoginPrompt(true);
    setShowChampionshipModal(true);
  };

  const handleLogout = async () => {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured) {
      await client.auth.signOut();
    }
    saveLocalAdminSession(null);
    setAdminUser(null);
    notify('Sesión administrativa cerrada. Modo Vista Espectador activo.');
  };

  // Operaciones CRUD encapsuladas por campeonato
  const handleCreateChampionship = async (
    input: Omit<Championship, 'id' | 'createdAt'>
  ) => {
    const created = await dbCreateChampionship(input);
    updateSnapshot((prev) => ({
      ...prev,
      championships: [created, ...prev.championships],
    }));
    setActiveChampionshipId(created.id);
    notify(`Campeonato "${created.name}" creado correctamente.`);
  };

  const handleUpdateChampionshipRules = async (updated: Championship) => {
    await dbUpdateChampionship(updated);
    updateSnapshot((prev) => ({
      ...prev,
      championships: prev.championships.map((c) =>
        c.id === updated.id ? updated : c
      ),
    }));
    notify('Reglas de puntaje actualizadas.');
  };

  const handleCreateTeam = async (input: Omit<Team, 'id' | 'createdAt'>) => {
    const created = await dbCreateTeam(input);
    updateSnapshot((prev) => ({
      ...prev,
      teams: [...prev.teams, created],
    }));
    notify(`Equipo "${created.name}" registrado.`);
  };

  const handleUpdateTeam = async (team: Team) => {
    await dbUpdateTeam(team);
    updateSnapshot((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === team.id ? team : t)),
    }));
  };

  const handleDeleteTeam = async (teamId: string) => {
    await dbDeleteTeam(teamId);
    updateSnapshot((prev) => ({
      ...prev,
      teams: prev.teams.filter((t) => t.id !== teamId),
      players: prev.players.filter((p) => p.teamId !== teamId),
      matches: prev.matches.filter(
        (m) => m.homeTeamId !== teamId && m.awayTeamId !== teamId
      ),
    }));
    notify('Equipo eliminado del campeonato.');
  };

  const handleCreatePlayer = async (input: Omit<Player, 'id' | 'createdAt'>) => {
    const created = await dbCreatePlayer(input);
    updateSnapshot((prev) => ({
      ...prev,
      players: [...prev.players, created],
    }));
    notify(`Jugador ${created.fullName} (#${created.jerseyNumber}) agregado.`);
  };

  const handleUpdatePlayer = async (player: Player) => {
    await dbUpdatePlayer(player);
    updateSnapshot((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === player.id ? player : p)),
    }));
    notify(`Ficha de ${player.fullName} actualizada.`);
  };

  const handleDeletePlayer = async (playerId: string) => {
    await dbDeletePlayer(playerId);
    updateSnapshot((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
    }));
    notify('Jugador retirado de la nómina.');
  };

  const handleCreateMatches = async (
    inputs: Omit<Match, 'id' | 'createdAt'>[]
  ) => {
    const created = await dbCreateMatches(inputs);
    updateSnapshot((prev) => ({
      ...prev,
      matches: [...prev.matches, ...created],
    }));
    notify(
      created.length === 1
        ? 'Encuentro programado correctamente.'
        : `${created.length} encuentros generados en la programación.`
    );
  };

  const handleUpdateMatch = async (match: Match) => {
    await dbUpdateMatch(match);
    updateSnapshot((prev) => ({
      ...prev,
      matches: prev.matches.map((m) => (m.id === match.id ? match : m)),
    }));
    notify('Resultado y estado del encuentro actualizados.');
  };

  const handleDeleteMatch = async (matchId: string) => {
    await dbDeleteMatch(matchId);
    updateSnapshot((prev) => ({
      ...prev,
      matches: prev.matches.filter((m) => m.id !== matchId),
    }));
    notify('Encuentro eliminado de la programación.');
  };

  const handleCreateNewsPost = async (input: Omit<NewsPost, 'id'>) => {
    const created = await dbCreateNewsPost(input);
    updateSnapshot((prev) => ({
      ...prev,
      newsPosts: [created, ...prev.newsPosts],
    }));
    notify('Noticia publicada en el muro del campeonato.');
  };

  const handleDeleteNewsPost = async (postId: string) => {
    await dbDeleteNewsPost(postId);
    updateSnapshot((prev) => ({
      ...prev,
      newsPosts: prev.newsPosts.filter((n) => n.id !== postId),
    }));
    notify('Publicación eliminada.');
  };

  // Datos filtrados estrictamente para el campeonato activo
  const activeChampionship = useMemo(() => {
    if (!snapshot) return null;
    return (
      snapshot.championships.find((c) => c.id === activeChampionshipId) ||
      snapshot.championships[0] ||
      null
    );
  }, [snapshot, activeChampionshipId]);

  const scopedTeams = useMemo(() => {
    if (!snapshot || !activeChampionship) return [];
    return snapshot.teams.filter(
      (t) => t.championshipId === activeChampionship.id
    );
  }, [snapshot, activeChampionship]);

  const scopedPlayers = useMemo(() => {
    if (!snapshot || !activeChampionship) return [];
    return snapshot.players.filter(
      (p) => p.championshipId === activeChampionship.id
    );
  }, [snapshot, activeChampionship]);

  const scopedMatches = useMemo(() => {
    if (!snapshot || !activeChampionship) return [];
    return snapshot.matches.filter(
      (m) => m.championshipId === activeChampionship.id
    );
  }, [snapshot, activeChampionship]);

  const scopedNews = useMemo(() => {
    if (!snapshot || !activeChampionship) return [];
    return snapshot.newsPosts.filter(
      (n) => n.championshipId === activeChampionship.id
    );
  }, [snapshot, activeChampionship]);

  const standings = useMemo(() => {
    if (!activeChampionship) return [];
    return computeStandings(
      scopedTeams,
      scopedMatches,
      activeChampionship,
      'todos_contra_todos'
    );
  }, [scopedTeams, scopedMatches, activeChampionship]);

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#F7F9FA]">
        <div className="h-16 bg-white border-b border-slate-200" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="h-80 rounded-2xl bg-slate-200/70 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 rounded-2xl bg-slate-200/70 animate-pulse" />
            <div className="h-44 rounded-2xl bg-slate-200/70 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FA] pb-16 md:pb-0">
      <HeaderAndNav
        activePage={activePage}
        onNavigate={setActivePage}
        adminUser={adminUser}
        onOpenLogin={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      {/* Sub-barra de contexto institucional y selector de campeonato */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
              U.E. 410 Hospital de Quillabamba
            </span>
            <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
              /
            </span>
            {snapshot.championships.length > 0 && (
              <div className="flex items-center gap-2 min-w-0">
                <Trophy className="w-4 h-4 text-[#0D5C63] shrink-0" />
                <label htmlFor="championship-switcher" className="sr-only">
                  Seleccionar campeonato activo
                </label>
                <select
                  id="championship-switcher"
                  value={activeChampionship?.id || ''}
                  onChange={(e) => setActiveChampionshipId(e.target.value)}
                  className="h-9 pl-2.5 pr-7 rounded-lg border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 max-w-[260px] sm:max-w-sm truncate focus:outline-none focus:border-[#0D5C63]"
                >
                  {snapshot.championships.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {adminUser ? (
              <>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#0D5C63]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Modo Administrador · {adminUser.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPostLoginPrompt(false);
                    setShowChampionshipModal(true);
                  }}
                  className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-[#0D5C63]" />
                  <span>Nuevo campeonato</span>
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-500 whitespace-nowrap">
                Modo Vista Pública
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notificación flotante accesible */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 max-w-sm rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {toastMessage}
        </div>
      )}

      {/* Contenido principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {!activeChampionship ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Trophy className="w-10 h-10 text-[#0D5C63] mx-auto mb-3" />
            <h1 className="text-xl font-bold text-slate-900">
              Aún no hay campeonatos registrados
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Inicia sesión como administrador para crear el primer campeonato de aniversario de la U.E. 410 Hospital de Quillabamba.
            </p>
            <button
              type="button"
              onClick={() =>
                adminUser ? setShowChampionshipModal(true) : setShowLoginModal(true)
              }
              className="mt-5 h-11 px-5 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F]"
            >
              {adminUser ? 'Crear campeonato' : 'Ingresar como administrador'}
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activePage}-${activeChampionship.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activePage === 'inicio' && (
                <InicioView
                  championship={activeChampionship}
                  teams={scopedTeams}
                  matches={scopedMatches}
                  newsPosts={scopedNews}
                  standings={standings}
                  adminUser={adminUser}
                  onNavigate={setActivePage}
                  onCreateNewsPost={handleCreateNewsPost}
                  onDeleteNewsPost={handleDeleteNewsPost}
                />
              )}

              {activePage === 'programacion' && (
                <ProgramacionView
                  championship={activeChampionship}
                  teams={scopedTeams}
                  matches={scopedMatches}
                  standings={standings}
                  adminUser={adminUser}
                  onCreateMatches={handleCreateMatches}
                  onUpdateMatch={handleUpdateMatch}
                  onDeleteMatch={handleDeleteMatch}
                />
              )}

              {activePage === 'equipos' && (
                <EquiposView
                  championship={activeChampionship}
                  teams={scopedTeams}
                  players={scopedPlayers}
                  adminUser={adminUser}
                  onCreateTeam={handleCreateTeam}
                  onUpdateTeam={handleUpdateTeam}
                  onDeleteTeam={handleDeleteTeam}
                  onCreatePlayer={handleCreatePlayer}
                  onUpdatePlayer={handleUpdatePlayer}
                  onDeletePlayer={handleDeletePlayer}
                />
              )}

              {activePage === 'posiciones' && (
                <PosicionesView
                  championship={activeChampionship}
                  standings={standings}
                  adminUser={adminUser}
                  onUpdateChampionshipRules={handleUpdateChampionshipRules}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Footer institucional sobrio */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Gest-Deport410 · U.E. 410 Hospital de Quillabamba, La Convención, Cusco
          </span>
          <span>
            Campeonatos Internos de Aniversario Institucional
          </span>
        </div>
      </footer>

      {/* Modales globales */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <ChampionshipModal
        isOpen={showChampionshipModal}
        onClose={() => {
          setShowChampionshipModal(false);
          setIsPostLoginPrompt(false);
        }}
        existingChampionships={snapshot.championships}
        activeChampionshipId={activeChampionship?.id || ''}
        onSelectExisting={(id) => {
          setActiveChampionshipId(id);
          notify('Campeonato seleccionado.');
        }}
        onCreateChampionship={handleCreateChampionship}
        isPostLoginPrompt={isPostLoginPrompt}
      />
    </div>
  );
}
