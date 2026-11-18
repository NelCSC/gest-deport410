'use client';

import React from 'react';
import {
  CalendarDays,
  Home,
  ListOrdered,
  LogIn,
  LogOut,
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
            className="text-lg sm:text-xl font-extrabold tracking-tight text-[#F8FAFC] hover:text-[#10B981] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] rounded-md"
          >
            Gest-Deport410
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
        <div className="grid grid-cols-4 h-14">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                  isActive ? 'text-[#10B981]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                <span className="text-[11px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
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
