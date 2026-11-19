'use client';

import React from 'react';
import {
  Award,
  CalendarDays,
  Home,
  ListOrdered,
  LogIn,
  LogOut,
  Trophy,
  Users,
} from 'lucide-react';
import { AdminUser, AppPage } from '@/lib/types';

interface HeaderAndNavProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  adminUser: AdminUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

const NAV_ITEMS: {
  id: AppPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'programacion', label: 'Programación', icon: CalendarDays },
  { id: 'equipos', label: 'Equipos', icon: Users },
  { id: 'posiciones', label: 'Posiciones', icon: ListOrdered },
  { id: 'goleadores', label: 'Goleadores', icon: Award },
];

export default function HeaderAndNav({
  activePage,
  onNavigate,
  adminUser,
  onOpenLogin,
  onLogout,
}: HeaderAndNavProps) {
  return (
    <>
      <header className="sticky top-0 z-40 bg-[#111827]/95 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onNavigate('inicio')}
            className="group flex items-center gap-2.5 sm:gap-3 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] rounded-xl py-1 pr-1"
          >
            <span
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#10B981] via-[#059669] to-[#06B6D4] p-[1.5px] shadow-[0_0_16px_rgba(16,185,129,0.28)] group-hover:shadow-[0_0_22px_rgba(16,185,129,0.45)] transition-shadow shrink-0"
              aria-hidden="true"
            >
              <span className="w-full h-full rounded-[10px] bg-gradient-to-br from-[#0F172A] via-[#090E17] to-[#071D24] flex items-center justify-center relative overflow-hidden">
                <span className="absolute -right-2 -top-2 w-6 h-12 rotate-[24deg] bg-gradient-to-b from-[#10B981]/30 via-[#06B6D4]/15 to-transparent" />
                <Trophy className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-[#10B981] stroke-[2.2] relative z-10 group-hover:scale-105 transition-transform" />
              </span>
            </span>

            <span className="flex flex-col items-start">
              <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight leading-none flex items-baseline">
                <span className="text-[#F8FAFC] group-hover:text-white transition-colors">
                  Gest-Deport
                </span>
                <span className="bg-gradient-to-r from-[#10B981] to-[#22D3EE] bg-clip-text text-transparent tabular-nums">
                  410
                </span>
              </span>
              <span
                className="h-[2px] w-10 group-hover:w-full bg-gradient-to-r from-[#10B981] via-[#06B6D4] to-transparent rounded-full mt-1 transition-all duration-300"
                aria-hidden="true"
              />
            </span>
          </button>

          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-7"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] rounded-sm ${
                    isActive
                      ? 'text-[#10B981] font-semibold'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#10B981] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            {adminUser ? (
              <button
                type="button"
                onClick={onLogout}
                className="h-10 px-4 rounded-xl border border-white/[0.12] bg-[#1E293B] text-xs sm:text-sm font-medium text-[#F8FAFC] hover:bg-[#273549] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <LogOut className="w-4 h-4 text-[#94A3B8]" />
                <span>Salir Admin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="h-10 px-4 rounded-xl bg-[#10B981] text-[#022C22] text-xs sm:text-sm font-bold hover:bg-[#34D399] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>Ingresar Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Barra inferior táctil en móviles (< md) */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111827]/95 backdrop-blur-md border-t border-white/[0.08]"
      >
        <div className="grid grid-cols-5 h-14">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] px-0.5 transition-colors ${
                  isActive ? 'text-[#10B981]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                <span className="text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
