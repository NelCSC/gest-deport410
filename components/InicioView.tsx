'use client';

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Camera,
  Clock,
  ImagePlus,
  MapPin,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { uploadTournamentImage } from '@/lib/cloudinary';
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
  NewsPost,
  StandingRow,
  Team,
} from '@/lib/types';
import SafeImage from './SafeImage';

interface InicioViewProps {
  championship: Championship;
  teams: Team[];
  matches: Match[];
  newsPosts: NewsPost[];
  standings: StandingRow[];
  adminUser: AdminUser | null;
  onNavigate: (page: AppPage) => void;
  onCreateNewsPost: (input: Omit<NewsPost, 'id'>) => Promise<void>;
  onDeleteNewsPost: (postId: string) => Promise<void>;
}

export default function InicioView({
  championship,
  teams,
  matches,
  newsPosts,
  standings,
  adminUser,
  onNavigate,
  onCreateNewsPost,
  onDeleteNewsPost,
}: InicioViewProps) {
  const [commentary, setCommentary] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
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

  return (
    <div className="space-y-10">
      {/* Hero Institucional U.E. 410 Hospital de Quillabamba */}
      <section className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
        <div className="relative h-64 sm:h-80 lg:h-96 w-full">
          <SafeImage
            src="/images/hero-hospital-stadium.jpg"
            alt="Campeonato Interno de Aniversario U.E. 410 Hospital de Quillabamba"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/20" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10 text-white">
            <p className="text-xs sm:text-sm font-medium text-emerald-300 tracking-wide mb-2">
              Aniversario U.E. 410 · Hospital de Quillabamba · Temporada {championship.seasonYear}
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight max-w-3xl text-balance">
              {championship.name}
            </h1>
            <p className="text-sm sm:text-base text-slate-200 mt-2 max-w-2xl line-clamp-2">
              {championship.description}
            </p>
          </div>
        </div>

        {/* Franja de indicadores clave con numerales tabulares */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-200 bg-white">
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Equipos inscritos</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {teams.length}
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Encuentros jugados</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {finishedMatches.length}{' '}
              <span className="text-sm font-normal text-slate-400">
                / {matches.length}
              </span>
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Goles / Puntos totales</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {totalGoals}
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-slate-500">Líder actual</p>
            <p className="text-base sm:text-lg font-bold text-[#0D5C63] truncate mt-1">
              {leader ? leader.team.name : 'Por definir'}
            </p>
            {leader && (
              <p className="text-xs text-slate-500 tabular-nums">
                {leader.points} pts · DG {leader.goalDifference >= 0 ? `+${leader.goalDifference}` : leader.goalDifference}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Dashboard Superior: Próximos Encuentros Programados */}
      <section aria-labelledby="proximos-encuentros-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <h2
              id="proximos-encuentros-heading"
              className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
            >
              Próximos encuentros programados
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Partidos más cercanos a la fecha con sede, horario y fase oficial.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('programacion')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0D5C63] hover:text-[#094348] transition-colors whitespace-nowrap"
          >
            <span>Ver programación completa</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-900">
              No hay encuentros pendientes en este campeonato
            </h3>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Todos los partidos programados han concluido o aún no se ha generado la programación inicial.
            </p>
            {adminUser && (
              <button
                type="button"
                onClick={() => onNavigate('programacion')}
                className="mt-4 h-10 px-4 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F] transition-colors"
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
              return (
                <article
                  key={match.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pb-3 border-b border-slate-100">
                    <span className="font-medium text-[#0D5C63]">
                      {STAGE_LABELS[match.stage]} · Jornada {match.matchday}
                    </span>
                    <span className="tabular-nums font-medium text-slate-700">
                      {match.status === 'en_juego' ? 'En juego ahora' : 'Programado'}
                    </span>
                  </div>

                  <div className="py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: home?.primaryColor || '#0D5C63' }}
                        />
                        <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          {home?.name || 'Equipo Local'}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 truncate pl-4 mt-0.5">
                        {home?.serviceArea}
                      </p>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-center min-w-[68px]">
                      {match.status === 'en_juego' &&
                      match.homeScore !== null &&
                      match.awayScore !== null ? (
                        <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                          {match.homeScore} - {match.awayScore}
                        </span>
                      ) : (
                        <span className="text-sm font-bold font-mono tabular-nums text-slate-800">
                          {formatMatchTime(match.scheduledAt)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          {away?.name || 'Equipo Visitante'}
                        </p>
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: away?.primaryColor || '#059669' }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 truncate pr-4 mt-0.5">
                        {away?.serviceArea}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="tabular-nums">{formatMatchDate(match.scheduledAt)}</span>
                      <span aria-hidden="true">·</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="tabular-nums">{formatMatchTime(match.scheduledAt)} h</span>
                    </span>
                    <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{match.venue}</span>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Sección Inferior: Noticias del Campeonato estilo Facebook */}
      <section aria-labelledby="noticias-heading" className="max-w-3xl mx-auto">
        <div className="mb-5">
          <h2
            id="noticias-heading"
            className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
          >
            Noticias y galería del campeonato
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Crónicas, comunicados e imágenes oficiales publicadas en orden cronológico reciente.
          </p>
        </div>

        {/* Publicador de Noticias solo para Administrador */}
        {adminUser && (
          <form
            onSubmit={handlePublishNews}
            className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Publicar nueva noticia con fotografía
              </h3>
              <span className="text-xs text-slate-500">{adminUser.name}</span>
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="news-commentary"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Comentario previo (se mostrará encima de la fotografía)
              </label>
              <textarea
                id="news-commentary"
                rows={3}
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                placeholder="Comparte una crónica del partido, resultado destacado o comunicado del aniversario U.E. 410..."
                className="w-full p-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/25 focus:border-[#0D5C63]"
              />
            </div>

            {previewUrl && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <img
                  src={previewUrl}
                  alt="Vista previa de publicación"
                  className="w-full max-h-80 object-cover"
                />
                <button
                  type="button"
                  onClick={clearSelectedImage}
                  aria-label="Quitar fotografía seleccionada"
                  className="absolute top-3 right-3 h-9 w-9 rounded-full bg-slate-900/75 text-white flex items-center justify-center hover:bg-slate-900 transition-colors"
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
                  className="cursor-pointer h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 inline-flex items-center gap-2 transition-colors"
                >
                  <ImagePlus className="w-4 h-4 text-[#0D5C63]" />
                  <span>{selectedFile ? 'Cambiar fotografía' : 'Subir fotografía'}</span>
                </label>
                {selectedFile && (
                  <span className="text-xs text-slate-500 truncate max-w-[180px]">
                    {selectedFile.name}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="h-10 px-5 rounded-xl bg-[#0D5C63] text-white text-sm font-semibold hover:bg-[#0A494F] disabled:opacity-60 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Publicando...' : 'Publicar noticia'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Feed de publicaciones estilo Facebook */}
        {sortedNews.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-base font-semibold text-slate-900">
              Aún no hay noticias publicadas en este campeonato
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              El administrador podrá compartir fotografías y comentarios de cada fecha aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedNews.map((post) => (
              <article
                key={post.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
              >
                {/* Cabecera del post: Autor + Fecha y hora exacta */}
                <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#0D5C63] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      410
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {post.authorName}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
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
                            className="h-8 px-2.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(post.id)}
                          aria-label="Eliminar noticia"
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Comentario previo superior */}
                <div className="px-5 pb-3.5">
                  <p className="text-sm sm:text-[15px] leading-relaxed text-slate-800 whitespace-pre-line">
                    {post.commentary}
                  </p>
                </div>

                {/* Fotografía inferior */}
                {post.imageUrl && (
                  <div className="w-full bg-slate-100 border-t border-slate-100">
                    <SafeImage
                      src={post.imageUrl}
                      alt={post.commentary.slice(0, 80)}
                      className="w-full max-h-[520px] object-cover"
                      fallbackLabel="Fotografía de noticia no disponible"
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
