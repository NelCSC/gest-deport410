'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Camera,
  Clock,
  ImagePlus,
  MapPin,
  MessageSquare,
  Move,
  RotateCcw,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { uploadTournamentImage } from '@/lib/cloudinary';
import {
  REACTION_OPTIONS,
  ReactionType,
  getOrCreateVisitorId,
  sanitizePlainText,
} from '@/lib/security';
import {
  STAGE_LABELS,
  formatMatchDate,
  formatMatchTime,
  formatNewsTimestamp,
} from '@/lib/tournament-utils';
import {
  AdminUser,
  AppPage,
  Championship,
  Match,
  NewsComment,
  NewsPost,
  NewsReaction,
  StandingRow,
  Team,
} from '@/lib/types';
import SafeImage from './SafeImage';

interface InicioViewProps {
  championship: Championship;
  teams: Team[];
  matches: Match[];
  newsPosts: NewsPost[];
  reactions: NewsReaction[];
  comments: NewsComment[];
  standings: StandingRow[];
  adminUser: AdminUser | null;
  contextBar?: React.ReactNode;
  onNavigate: (page: AppPage) => void;
  onUpdateChampionshipCover: (
    heroImageUrl: string,
    heroImagePosition: string
  ) => Promise<void>;
  onCreateNewsPost: (input: Omit<NewsPost, 'id'>) => Promise<void>;
  onDeleteNewsPost: (postId: string) => Promise<void>;
  onToggleReaction: (
    postId: string,
    visitorId: string,
    reactionType: ReactionType
  ) => Promise<void>;
  onAddComment: (
    postId: string,
    visitorId: string,
    authorAlias: string,
    content: string,
    honeypot: string
  ) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

function parseObjectPosition(pos: string): { x: number; y: number } {
  const parts = pos.trim().split(/\s+/);
  const x = parseInt(parts[0] || '50', 10);
  const y = parseInt(parts[1] || '50', 10);
  return {
    x: isNaN(x) ? 50 : Math.min(100, Math.max(0, x)),
    y: isNaN(y) ? 50 : Math.min(100, Math.max(0, y)),
  };
}

export default function InicioView({
  championship,
  teams,
  matches,
  newsPosts,
  reactions,
  comments,
  standings,
  adminUser,
  contextBar,
  onNavigate,
  onUpdateChampionshipCover,
  onCreateNewsPost,
  onDeleteNewsPost,
  onToggleReaction,
  onAddComment,
  onDeleteComment,
}: InicioViewProps) {
  // Publicación de noticias (Admin)
  const [commentary, setCommentary] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de personalización de portada (Admin)
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(championship.heroImageUrl);
  const [coverPosX, setCoverPosX] = useState(50);
  const [coverPosY, setCoverPosY] = useState(50);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [savingCover, setSavingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useLockBodyScroll(showCoverModal);

  // Identificador anónimo del visitante en localStorage para reacciones y comentarios
  const [visitorId, setVisitorId] = useState('');
  useEffect(() => {
    setVisitorId(getOrCreateVisitorId());
  }, []);

  // Estado por publicación para formulario de comentarios y feedback de errores
  const [commentDrafts, setCommentDrafts] = useState<
    Record<string, { alias: string; content: string; website: string }>
  >({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string | null>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [reactionErrors, setReactionErrors] = useState<Record<string, string | null>>({});
  const [animatingReaction, setAnimatingReaction] = useState<string | null>(null);

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const upcomingMatches = matches
    .filter((m) => m.status !== 'finalizado')
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )
    .slice(0, 4);

  const finishedMatches = matches.filter((m) => m.status === 'finalizado');
  const totalGoals = finishedMatches.reduce(
    (sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0),
    0
  );
  const leader = standings[0];

  const sortedNews = [...newsPosts].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Handlers de portada personalizada
  const openCoverEditor = () => {
    const { x, y } = parseObjectPosition(championship.heroImagePosition || '50% 50%');
    setCoverPreviewUrl(championship.heroImageUrl || '/images/hero-hospital-stadium.jpg');
    setCoverPosX(x);
    setCoverPosY(y);
    setCoverFile(null);
    setCoverError(null);
    setShowCoverModal(true);
  };

  const handleCoverFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoverError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setCoverError('Formato inválido. Sube una imagen JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverError('La imagen de portada supera el máximo de 5 MB.');
      return;
    }
    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveCover = async (e: React.FormEvent) => {
    e.preventDefault();
    setCoverError(null);
    setSavingCover(true);
    try {
      let finalUrl = coverPreviewUrl || '/images/hero-hospital-stadium.jpg';
      if (coverFile) {
        const uploaded = await uploadTournamentImage(coverFile, 'portadas');
        finalUrl = uploaded.url;
      }
      const posString = `${coverPosX}% ${coverPosY}%`;
      await onUpdateChampionshipCover(finalUrl, posString);
      setShowCoverModal(false);
    } catch (err) {
      setCoverError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la foto de portada.'
      );
    } finally {
      setSavingCover(false);
    }
  };

  // Handlers de noticias (Admin)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setFormError('Formato inválido. Selecciona una fotografía JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('La imagen supera 5 MB. Por favor elige una foto más ligera.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublishNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (commentary.trim().length < 8) {
      setFormError(
        'Escribe un comentario previo de al menos 8 caracteres para contextualizar la noticia.'
      );
      return;
    }
    if (!selectedFile) {
      setFormError(
        'Adjunta una fotografía del encuentro o actividad para publicar en la sección de noticias.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = await uploadTournamentImage(selectedFile, 'noticias');
      await onCreateNewsPost({
        championshipId: championship.id,
        commentary: commentary.trim(),
        imageUrl: uploaded.url,
        authorName: adminUser?.name || 'Comisión de Deportes U.E. 410',
        publishedAt: new Date().toISOString(),
      });
      setCommentary('');
      clearSelectedImage();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'No se pudo publicar la noticia. Verifica la imagen e intenta nuevamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers de Reacciones y Comentarios públicos
  const handleReactionClick = async (postId: string, type: ReactionType) => {
    const activeVisitor = visitorId || getOrCreateVisitorId();
    if (!activeVisitor) return;
    setReactionErrors((prev) => ({ ...prev, [postId]: null }));
    setAnimatingReaction(`${postId}:${type}`);
    setTimeout(() => setAnimatingReaction(null), 320);

    try {
      await onToggleReaction(postId, activeVisitor, type);
    } catch (err) {
      setReactionErrors((prev) => ({
        ...prev,
        [postId]:
          err instanceof Error
            ? err.message
            : 'No se pudo registrar tu reacción en este momento.',
      }));
    }
  };

  const updateDraft = (
    postId: string,
    field: 'alias' | 'content' | 'website',
    value: string
  ) => {
    setCommentDrafts((prev) => {
      const current = prev[postId] || { alias: '', content: '', website: '' };
      return {
        ...prev,
        [postId]: { ...current, [field]: value },
      };
    });
  };

  const handleSubmitComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const draft = commentDrafts[postId] || { alias: '', content: '', website: '' };
    setCommentErrors((prev) => ({ ...prev, [postId]: null }));

    const cleanContent = sanitizePlainText(draft.content, 500);
    if (cleanContent.length < 2) {
      setCommentErrors((prev) => ({
        ...prev,
        [postId]: 'Escribe un comentario de al menos 2 caracteres.',
      }));
      return;
    }
    if (draft.content.trim().length > 500) {
      setCommentErrors((prev) => ({
        ...prev,
        [postId]: 'El comentario no puede superar los 500 caracteres.',
      }));
      return;
    }
    if (draft.alias.trim().length > 30) {
      setCommentErrors((prev) => ({
        ...prev,
        [postId]: 'El alias no puede superar los 30 caracteres.',
      }));
      return;
    }

    const activeVisitor = visitorId || getOrCreateVisitorId();
    setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
    try {
      await onAddComment(
        postId,
        activeVisitor,
        sanitizePlainText(draft.alias, 30),
        cleanContent,
        draft.website
      );
      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: { alias: draft.alias, content: '', website: '' },
      }));
    } catch (err) {
      setCommentErrors((prev) => ({
        ...prev,
        [postId]:
          err instanceof Error
            ? err.message
            : 'No se pudo publicar el comentario. Intenta nuevamente.',
      }));
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Hero Institucional U.E 410: Portada principal al frente en móvil y escritorio */}
      <section className="-mx-4 -mt-6 sm:mx-0 sm:mt-0 sm:rounded-2xl overflow-hidden border-b sm:border border-white/[0.08] bg-[#111827]">
        <div className="relative h-[360px] sm:h-[410px] lg:h-[440px] w-full bg-[#1E293B]">
          <SafeImage
            src={championship.heroImageUrl || '/images/hero-hospital-stadium.jpg'}
            alt="Campeonato Interno de Aniversario U.E 410 Hospital de Quillabamba"
            className="w-full h-full object-cover transition-all duration-300"
            style={{ objectPosition: championship.heroImagePosition || '50% 50%' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090E17] via-[#090E17]/55 to-[#090E17]/15" />

          {adminUser && (
            <button
              type="button"
              onClick={openCoverEditor}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-10 min-h-[40px] px-3.5 rounded-xl bg-[#090E17]/80 hover:bg-[#090E17] text-[#F8FAFC] border border-[#10B981]/35 backdrop-blur-sm text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Camera className="w-4 h-4 text-[#10B981]" />
              <span>Cambiar y posicionar portada</span>
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10 text-[#F8FAFC]">
            <p className="text-xs sm:text-sm font-semibold text-[#10B981] tracking-wide mb-1.5">
              U.E 410 Hospital de Quillabamba · Temporada {championship.seasonYear}
            </p>
            <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight leading-[1.12] max-w-3xl text-balance text-[#F8FAFC]">
              {championship.name}
            </h1>
            <p className="text-xs sm:text-base text-[#CBD5E1] mt-2 max-w-2xl line-clamp-2">
              {championship.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-5 mt-4">
              <button
                type="button"
                onClick={() => onNavigate('programacion')}
                className="h-11 px-5 rounded-xl bg-[#10B981] text-[#022C22] text-xs sm:text-sm font-bold hover:bg-[#34D399] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span>Ver programación</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('posiciones')}
                className="min-h-[44px] text-xs sm:text-sm font-semibold text-[#06B6D4] hover:text-[#22D3EE] transition-colors inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>Tabla de posiciones →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Franja de indicadores clave */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-white/[0.08] bg-[#111827]">
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-[#94A3B8]">Equipos inscritos</p>
            <p className="text-2xl font-bold text-[#F8FAFC] tabular-nums mt-1">
              {teams.length}
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-[#94A3B8]">Encuentros jugados</p>
            <p className="text-2xl font-bold text-[#F8FAFC] tabular-nums mt-1">
              {finishedMatches.length}{' '}
              <span className="text-sm font-normal text-[#94A3B8]">
                / {matches.length}
              </span>
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-[#94A3B8]">Goles / Puntos totales</p>
            <p className="text-2xl font-bold text-[#06B6D4] tabular-nums mt-1">
              {totalGoals}
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-[#94A3B8]">Líder actual</p>
            <p className="text-base sm:text-lg font-bold text-[#10B981] truncate mt-1">
              {leader ? leader.team.name : 'Por definir'}
            </p>
            {leader && (
              <p className="text-xs text-[#94A3B8] tabular-nums">
                {leader.points} pts · DG {leader.goalDifference >= 0 ? `+${leader.goalDifference}` : leader.goalDifference}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Selector de campeonato / gestión justo debajo de la portada */}
      {contextBar}

      {/* Dashboard Superior: Próximos Encuentros Programados */}
      <section aria-labelledby="proximos-encuentros-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <h2
              id="proximos-encuentros-heading"
              className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight"
            >
              Próximos encuentros programados
            </h2>
            <p className="text-sm text-[#94A3B8] mt-0.5">
              Partidos más cercanos a la fecha con sede, horario y fase oficial.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('programacion')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#06B6D4] hover:text-[#22D3EE] transition-colors whitespace-nowrap"
          >
            <span>Ver programación completa</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#111827] p-8 text-center">
            <Calendar className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
            <h3 className="text-base font-semibold text-[#F8FAFC]">
              No hay encuentros pendientes en este campeonato
            </h3>
            <p className="text-sm text-[#94A3B8] mt-1 max-w-md mx-auto">
              Todos los partidos programados han concluido o aún no se ha generado la programación inicial.
            </p>
            {adminUser && (
              <button
                type="button"
                onClick={() => onNavigate('programacion')}
                className="mt-4 h-10 px-4 rounded-xl bg-[#10B981] text-[#022C22] text-sm font-bold hover:bg-[#34D399] transition-colors"
              >
                Ir a Programación
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMatches.map((match) => {
              const home = teamMap.get(match.homeTeamId);
              const away = teamMap.get(match.awayTeamId);
              const isLive = match.status === 'en_juego';

              return (
                <article
                  key={match.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#111827] p-5 hover:border-[#10B981]/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8] pb-3 border-b border-white/[0.06]">
                    <span className="font-semibold text-[#10B981]">
                      {STAGE_LABELS[match.stage]} · Jornada {match.matchday}
                    </span>
                    <span
                      className={`tabular-nums font-semibold ${
                        isLive ? 'text-[#06B6D4]' : 'text-[#94A3B8]'
                      }`}
                    >
                      {isLive ? 'En juego ahora' : 'Programado'}
                    </span>
                  </div>

                  <div className="py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-[4px] shrink-0 ring-1 ring-white/20"
                          style={{ backgroundColor: home?.primaryColor || '#10B981' }}
                        />
                        <p className="text-sm sm:text-base font-bold text-[#F8FAFC] truncate">
                          {home?.name || 'Equipo Local'}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`px-3 py-1.5 rounded-xl text-center min-w-[72px] border ${
                        isLive
                          ? 'bg-[#06B6D4]/15 border-[#06B6D4]/40 text-[#06B6D4]'
                          : 'bg-[#0F172A] border-white/[0.08] text-[#F8FAFC]'
                      }`}
                    >
                      {isLive &&
                      match.homeScore !== null &&
                      match.awayScore !== null ? (
                        <span className="text-base font-bold font-mono tabular-nums">
                          {match.homeScore} - {match.awayScore}
                        </span>
                      ) : (
                        <span className="text-sm font-bold font-mono tabular-nums">
                          {formatMatchTime(match.scheduledAt)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <p className="text-sm sm:text-base font-bold text-[#F8FAFC] truncate">
                          {away?.name || 'Equipo Visitante'}
                        </p>
                        <span
                          className="w-3 h-3 rounded-[4px] shrink-0 ring-1 ring-white/20"
                          style={{ backgroundColor: away?.primaryColor || '#06B6D4' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#06B6D4]" />
                      <span className="tabular-nums">{formatMatchDate(match.scheduledAt)}</span>
                      <span aria-hidden="true">·</span>
                      <Clock className="w-3.5 h-3.5 text-[#06B6D4]" />
                      <span className="tabular-nums">{formatMatchTime(match.scheduledAt)} h</span>
                    </span>
                    <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                      <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                      <span className="truncate">{match.venue}</span>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Sección Inferior: Noticias estilo Facebook con Reacciones y Comentarios Públicos */}
      <section aria-labelledby="noticias-heading" className="max-w-3xl mx-auto">
        <div className="mb-5">
          <h2
            id="noticias-heading"
            className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight"
          >
            Noticias y galería del campeonato
          </h2>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Crónicas e imágenes oficiales. Reacciona y deja tus comentarios de aliento sin necesidad de registrarte.
          </p>
        </div>

        {/* Publicador de Noticias solo para Administrador */}
        {adminUser && (
          <form
            onSubmit={handlePublishNews}
            className="mb-8 rounded-2xl border border-white/[0.08] bg-[#111827] p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#F8FAFC]">
                Publicar nueva noticia con fotografía
              </h3>
              <span className="text-xs text-[#10B981] font-medium">{adminUser.name}</span>
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-sm text-rose-200"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="news-commentary"
                className="block text-xs font-medium text-[#94A3B8] mb-1.5"
              >
                Comentario previo (se mostrará encima de la fotografía)
              </label>
              <textarea
                id="news-commentary"
                rows={3}
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                placeholder="Comparte una crónica del partido, resultado destacado o comunicado del aniversario U.E. 410..."
                className="w-full p-3.5 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981]"
              />
            </div>

            {previewUrl && (
              <div className="relative rounded-[12px] overflow-hidden border-[1.5px] border-[#10B981]/30 bg-[#1E293B]">
                <img
                  src={previewUrl}
                  alt="Vista previa de publicación"
                  className="w-full max-h-80 object-cover"
                />
                <button
                  type="button"
                  onClick={clearSelectedImage}
                  aria-label="Quitar fotografía seleccionada"
                  className="absolute top-3 right-3 h-9 w-9 rounded-full bg-[#090E17]/85 text-[#F8FAFC] border border-white/15 flex items-center justify-center hover:bg-[#090E17] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="news-photo-upload"
                />
                <label
                  htmlFor="news-photo-upload"
                  className="cursor-pointer h-10 px-4 rounded-xl border border-white/[0.12] bg-[#1E293B] hover:bg-[#273549] text-sm font-medium text-[#F8FAFC] inline-flex items-center gap-2 transition-colors"
                >
                  <ImagePlus className="w-4 h-4 text-[#10B981]" />
                  <span>{selectedFile ? 'Cambiar fotografía' : 'Subir fotografía'}</span>
                </label>
                {selectedFile && (
                  <span className="text-xs text-[#94A3B8] truncate max-w-[180px]">
                    {selectedFile.name}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="h-10 px-5 rounded-xl bg-[#10B981] text-[#022C22] text-sm font-bold hover:bg-[#34D399] disabled:opacity-60 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Publicando...' : 'Publicar noticia'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Feed de publicaciones */}
        {sortedNews.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#111827] p-10 text-center">
            <Camera className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
            <h3 className="text-base font-semibold text-[#F8FAFC]">
              Aún no hay noticias publicadas en este campeonato
            </h3>
            <p className="text-sm text-[#94A3B8] mt-1">
              El administrador podrá compartir fotografías y comentarios de cada fecha aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedNews.map((post) => {
              const postReactions = reactions.filter((r) => r.postId === post.id);
              const myReaction = postReactions.find(
                (r) => r.visitorId === visitorId
              )?.reactionType;
              const postComments = comments
                .filter((c) => c.postId === post.id)
                .sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );

              const draft = commentDrafts[post.id] || {
                alias: '',
                content: '',
                website: '',
              };

              return (
                <article
                  key={post.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#111827] overflow-hidden"
                >
                  {/* Cabecera del post */}
                  <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-[12px] bg-[#1E293B] border-[1.5px] border-[#10B981]/30 text-[#10B981] font-extrabold text-xs flex items-center justify-center shrink-0">
                        410
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#F8FAFC] truncate">
                          {post.authorName}
                        </p>
                        <p className="text-xs text-[#94A3B8] tabular-nums">
                          {formatNewsTimestamp(post.publishedAt)} · U.E. 410 Hospital de Quillabamba
                        </p>
                      </div>
                    </div>

                    {adminUser && (
                      <div className="shrink-0">
                        {confirmDeleteId === post.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteNewsPost(post.id);
                                setConfirmDeleteId(null);
                              }}
                              className="h-8 px-2.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="h-8 px-2.5 rounded-lg border border-white/[0.12] bg-[#1E293B] text-xs font-medium text-[#CBD5E1] hover:bg-[#273549]"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(post.id)}
                            aria-label="Eliminar noticia"
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comentario previo superior */}
                  <div className="px-5 pb-3.5">
                    <p className="text-sm sm:text-[15px] leading-relaxed text-[#E2E8F0] whitespace-pre-line">
                      {post.commentary}
                    </p>
                  </div>

                  {/* Fotografía inferior */}
                  {post.imageUrl && (
                    <div className="px-5 pb-4">
                      <div className="w-full rounded-[12px] overflow-hidden bg-[#1E293B] border-[1.5px] border-[#10B981]/30">
                        <SafeImage
                          src={post.imageUrl}
                          alt={post.commentary.slice(0, 80)}
                          className="w-full max-h-[520px] object-cover"
                          fallbackLabel="Fotografía de noticia no disponible"
                        />
                      </div>
                    </div>
                  )}

                  {/* Barra de Reacciones Múltiples (sin necesidad de login) */}
                  <div className="px-5 py-3.5 border-t border-b border-white/[0.06] bg-[#0F172A]/60 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div
                        className="flex flex-wrap items-center gap-2"
                        role="group"
                        aria-label="Reacciones a la publicación"
                      >
                        {REACTION_OPTIONS.map((opt) => {
                          const count = postReactions.filter(
                            (r) => r.reactionType === opt.type
                          ).length;
                          const isSelected = myReaction === opt.type;
                          const isPopping =
                            animatingReaction === `${post.id}:${opt.type}`;

                          return (
                            <motion.button
                              key={opt.type}
                              type="button"
                              onClick={() => handleReactionClick(post.id, opt.type)}
                              animate={
                                isPopping ? { scale: [1, 1.18, 1] } : { scale: 1 }
                              }
                              transition={{ duration: 0.25 }}
                              className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-all active:scale-95 ${
                                isSelected
                                  ? `${opt.activeBgClass} ${opt.activeBorderClass} ${opt.activeTextClass} font-semibold`
                                  : 'bg-[#1E293B] border-white/[0.08] text-[#CBD5E1] hover:bg-[#273549] hover:border-white/[0.16]'
                              }`}
                              aria-pressed={isSelected}
                            >
                              <span
                                className={`text-base leading-none transition-transform ${
                                  isSelected ? 'scale-110' : ''
                                }`}
                                aria-hidden="true"
                              >
                                {opt.emoji}
                              </span>
                              <span className="whitespace-nowrap">{opt.label}</span>
                              {count > 0 && (
                                <span className="font-mono tabular-nums font-bold pl-0.5">
                                  {count}
                                </span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>

                      <span className="text-xs text-[#94A3B8] tabular-nums inline-flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#06B6D4]" />
                        <span>
                          {postComments.length}{' '}
                          {postComments.length === 1 ? 'comentario' : 'comentarios'}
                        </span>
                      </span>
                    </div>

                    {reactionErrors[post.id] && (
                      <p role="alert" className="text-xs text-rose-400 font-medium">
                        {reactionErrors[post.id]}
                      </p>
                    )}
                  </div>

                  {/* Sección de Comentarios Públicos */}
                  <div className="px-5 py-4 space-y-4 bg-[#111827]">
                    {postComments.length > 0 && (
                      <div className="space-y-3">
                        {postComments.map((cmt) => (
                          <div
                            key={cmt.id}
                            className="rounded-xl bg-[#0F172A] border border-white/[0.06] px-3.5 py-2.5 flex items-start justify-between gap-2.5"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-bold text-[#F8FAFC]">
                                  {cmt.authorAlias}
                                </span>
                                <span className="text-[#475569]" aria-hidden="true">
                                  ·
                                </span>
                                <span className="text-[#94A3B8] tabular-nums">
                                  {formatNewsTimestamp(cmt.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-[#CBD5E1] whitespace-pre-line break-words">
                                {cmt.content}
                              </p>
                            </div>

                            {adminUser && (
                              <button
                                type="button"
                                onClick={() => onDeleteComment(cmt.id)}
                                aria-label="Eliminar comentario"
                                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-rose-500/10 shrink-0 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulario de comentario sin registro + Honeypot */}
                    <form
                      onSubmit={(e) => handleSubmitComment(e, post.id)}
                      className="space-y-2.5 pt-1"
                    >
                      {commentErrors[post.id] && (
                        <div
                          role="alert"
                          className="flex items-start gap-2 rounded-xl bg-rose-950/60 border border-rose-500/40 p-2.5 text-xs text-rose-200"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                          <span>{commentErrors[post.id]}</span>
                        </div>
                      )}

                      {/* Campo Honeypot anti-bots oculto para usuarios reales */}
                      <div className="hidden" aria-hidden="true">
                        <label htmlFor={`website-${post.id}`}>No llenar este campo</label>
                        <input
                          id={`website-${post.id}`}
                          name="website"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={draft.website}
                          onChange={(e) =>
                            updateDraft(post.id, 'website', e.target.value)
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2.5">
                        <input
                          type="text"
                          maxLength={30}
                          value={draft.alias}
                          onChange={(e) =>
                            updateDraft(post.id, 'alias', e.target.value)
                          }
                          placeholder="Tu nombre o alias (opcional)"
                          className="h-10 px-3 rounded-xl border border-white/[0.1] bg-[#0F172A] text-xs sm:text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#10B981]/25 focus:border-[#10B981]"
                        />

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              maxLength={500}
                              value={draft.content}
                              onChange={(e) =>
                                updateDraft(post.id, 'content', e.target.value)
                              }
                              placeholder="Escribe un comentario..."
                              className="w-full h-10 pl-3 pr-14 rounded-xl border border-white/[0.1] bg-[#0F172A] text-xs sm:text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#10B981]/25 focus:border-[#10B981]"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono tabular-nums text-[#64748B]">
                              {draft.content.length}/500
                            </span>
                          </div>

                          <button
                            type="submit"
                            disabled={Boolean(commentSubmitting[post.id])}
                            className="h-10 px-4 rounded-xl bg-[#10B981] text-[#022C22] text-xs sm:text-sm font-bold hover:bg-[#34D399] disabled:opacity-60 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">
                              {commentSubmitting[post.id] ? 'Enviando...' : 'Comentar'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Administrador: Cambiar y posicionar foto principal de portada */}
      {showCoverModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cover-modal-title"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-[#111827] border border-white/[0.1] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
              <div>
                <h2 id="cover-modal-title" className="text-lg font-bold text-[#F8FAFC]">
                  Personalizar foto principal de portada
                </h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Sube una fotografía institucional y ajusta el encuadre exacto para el inicio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCoverModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveCover}
              className="p-6 space-y-5 overflow-y-auto overscroll-contain flex-1"
            >
              {coverError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-sm text-rose-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                  <span>{coverError}</span>
                </div>
              )}

              {/* Vista previa en vivo del encuadre */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#CBD5E1]">
                  Vista previa en tiempo real ({coverPosX}% horizontal · {coverPosY}% vertical)
                </p>
                <div className="relative h-56 sm:h-64 w-full rounded-[12px] overflow-hidden border-[1.5px] border-[#10B981]/30 bg-[#1E293B]">
                  <img
                    src={coverPreviewUrl || '/images/hero-hospital-stadium.jpg'}
                    alt="Vista previa de portada"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `${coverPosX}% ${coverPosY}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090E17]/90 via-[#090E17]/40 to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 text-[#F8FAFC] pointer-events-none">
                    <p className="text-xs text-[#10B981] font-semibold">
                      U.E. 410 Hospital de Quillabamba
                    </p>
                    <p className="text-base font-bold truncate">{championship.name}</p>
                  </div>
                </div>
              </div>

              {/* Subir imagen o restaurar */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverFilePick}
                  className="hidden"
                  id="hero-cover-upload"
                />
                <label
                  htmlFor="hero-cover-upload"
                  className="cursor-pointer h-10 px-4 rounded-xl border border-white/[0.12] bg-[#1E293B] hover:bg-[#273549] text-xs sm:text-sm font-medium text-[#F8FAFC] inline-flex items-center gap-2 transition-colors"
                >
                  <ImagePlus className="w-4 h-4 text-[#10B981]" />
                  <span>Subir nueva foto de portada</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreviewUrl('/images/hero-hospital-stadium.jpg');
                    setCoverPosX(50);
                    setCoverPosY(50);
                  }}
                  className="h-10 px-3.5 rounded-xl border border-white/[0.1] bg-[#0F172A] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar imagen predeterminada</span>
                </button>
              </div>

              {/* Controles de posición personalizada */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#F8FAFC] inline-flex items-center gap-1.5">
                    <Move className="w-4 h-4 text-[#10B981]" />
                    <span>Posición personalizada del encuadre</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: 'Superior', x: 50, y: 15 },
                      { label: 'Centro', x: 50, y: 50 },
                      { label: 'Inferior', x: 50, y: 85 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setCoverPosX(preset.x);
                          setCoverPosY(preset.y);
                        }}
                        className="h-7 px-2.5 rounded-lg border border-white/[0.1] bg-[#1E293B] hover:bg-[#273549] text-xs font-medium text-[#CBD5E1]"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                      <span>Posición Horizontal (Izq ↔ Der)</span>
                      <span className="font-mono tabular-nums font-semibold text-[#F8FAFC]">
                        {coverPosX}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={coverPosX}
                      onChange={(e) => setCoverPosX(Number(e.target.value))}
                      className="w-full accent-[#10B981]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                      <span>Posición Vertical (Arriba ↔ Abajo)</span>
                      <span className="font-mono tabular-nums font-semibold text-[#F8FAFC]">
                        {coverPosY}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={coverPosY}
                      onChange={(e) => setCoverPosY(Number(e.target.value))}
                      className="w-full accent-[#10B981]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCoverModal(false)}
                  className="h-10 px-4 rounded-xl border border-white/[0.1] bg-[#1E293B] text-sm font-medium text-[#F8FAFC] hover:bg-[#273549]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCover}
                  className="h-10 px-5 rounded-xl bg-[#10B981] text-[#022C22] text-sm font-bold hover:bg-[#34D399] disabled:opacity-60"
                >
                  {savingCover ? 'Guardando portada...' : 'Guardar portada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
