'use client';

import React from 'react';
import { Award, Building2, Mail, MapPin, ShieldCheck, Trophy } from 'lucide-react';
import { AppPage } from '@/lib/types';

interface FooterProps {
  onNavigate: (page: AppPage) => void;
}

const FOOTER_LINKS: { id: AppPage; label: string }[] = [
  { id: 'inicio', label: 'Inicio y Noticias' },
  { id: 'programacion', label: 'Programación y Llaves' },
  { id: 'equipos', label: 'Equipos y Nóminas' },
  { id: 'posiciones', label: 'Tabla de Posiciones' },
];

export default function Footer({ onNavigate }: FooterProps) {
  const handleJump = (page: AppPage) => {
    onNavigate(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="border-t border-white/[0.08] bg-[#111827] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">
          {/* Bloque 1: Entidad principal */}
          <div className="md:col-span-5 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#1E293B] border-[1.5px] border-[#10B981]/30 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-base font-extrabold tracking-tight text-[#F8FAFC]">
                  Gest-Deport410
                </p>
                <p className="text-xs font-semibold text-[#10B981]">
                  U.E 410 Hospital de Quillabamba
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-[#94A3B8] max-w-md">
              Plataforma oficial para la gestión, programación, control disciplinario y difusión de los campeonatos internos deportivos de aniversario institucional.
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#94A3B8] pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
                <span>U.E 410 Hospital de Quillabamba</span>
              </span>
              <span className="text-white/20" aria-hidden="true">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <span>Quillabamba, La Convención, Cusco</span>
              </span>
            </div>
          </div>

          {/* Bloque 2: Organización / Responsables */}
          <div className="md:col-span-4 space-y-3">
            <h2 className="text-sm font-bold text-[#F8FAFC]">
              Organización y Responsables
            </h2>

            <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Award className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[#F8FAFC]">
                    Comisión Organizadora de Fútbol
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Coordinación General Deportiva · Aniversario U.E 410
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] space-y-1.5 text-xs text-[#94A3B8]">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
                  <span>Sub-Comisión de Disciplina, Arbitraje y Mesa de Control</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <span>Comisión de Deportes — Sede Hospital de Quillabamba</span>
                </p>
              </div>
            </div>
          </div>

          {/* Bloque 3: Secciones del torneo */}
          <div className="md:col-span-3 space-y-3">
            <h2 className="text-sm font-bold text-[#F8FAFC]">
              Secciones del Campeonato
            </h2>
            <nav aria-label="Navegación en pie de página" className="flex flex-col gap-1">
              {FOOTER_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleJump(link.id)}
                  className="text-left min-h-[38px] px-2 -mx-2 rounded-lg text-sm text-[#94A3B8] hover:text-[#10B981] hover:bg-white/[0.03] transition-colors flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <span className="text-xs text-[#64748B]" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Barra inferior de derechos de autor */}
      <div className="border-t border-white/[0.08] bg-[#090E17]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#94A3B8]">
          <p className="text-center sm:text-left font-medium text-[#CBD5E1]">
            © 2026 U.E 410 Hospital de Quillabamba. Todos los derechos reservados.
          </p>
          <p className="text-[#94A3B8] text-center sm:text-right">
            Comisión Organizadora de Fútbol · Gest-Deport410
          </p>
        </div>
      </div>
    </footer>
  );
}
