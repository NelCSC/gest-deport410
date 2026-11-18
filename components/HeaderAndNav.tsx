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

const NAV_ITEMS: { id: AppPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onNavigate('inicio')}
            className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0D5C63] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C63] rounded-md"
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
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C63] rounded-sm ${
                    isActive
                      ? 'text-[#0D5C63] font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#0D5C63] rounded-full" />
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
                className="h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <LogOut className="w-4 h-4 text-slate-600" />
                <span>Salir Admin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="h-10 px-4 rounded-xl bg-[#0D5C63] text-white text-xs sm:text-sm font-semibold hover:bg-[#0A494F] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>Ingresar Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Barra inferior táctil en móviles (< md), respetando máximo 15% del viewport */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
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
                  isActive ? 'text-[#0D5C63]' : 'text-slate-500 hover:text-slate-800'
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
