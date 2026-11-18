'use client';

import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, ShieldCheck, X } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { AdminUser } from '@/lib/types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
}: LoginModalProps) {
  useLockBodyScroll(isOpen);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const validateFields = (): string | null => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return 'Ingresa tu correo o usuario de administrador.';
    }
    if (!trimmedEmail.includes('@')) {
      return 'Ingresa un correo electrónico válido (ejemplo: deportes@hospitalquillabamba.gob.pe).';
    }
    if (!password) {
      return 'Ingresa tu contraseña para continuar.';
    }
    if (password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationMsg = validateFields();
    if (validationMsg) {
      setError(validationMsg);
      return;
    }

    setLoading(true);
    try {
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured) {
        const { data, error: authError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError || !data.user) {
          setError(
            authError?.message === 'Invalid login credentials'
              ? 'Credenciales incorrectas. Verifica tu correo y contraseña en Supabase Auth.'
              : authError?.message || 'No se pudo iniciar sesión. Intenta nuevamente.'
          );
          setLoading(false);
          return;
        }

        onLoginSuccess({
          id: data.user.id,
          email: data.user.email || email.trim(),
          name:
            String(data.user.user_metadata?.full_name || '') ||
            'Administrador U.E. 410',
          mode: 'supabase',
        });
      } else {
        if (
          email.trim().toLowerCase() === 'admin@hospitalquillabamba.gob.pe' &&
          password === 'Gest410Admin'
        ) {
          onLoginSuccess({
            id: 'local-admin-ue410',
            email: email.trim(),
            name: 'Comisión de Deportes U.E. 410',
            mode: 'local',
          });
        } else {
          setError(
            'Credenciales inválidas. Para pruebas locales usa admin@hospitalquillabamba.gob.pe y clave Gest410Admin, o conecta tu proyecto Supabase en .env.local.'
          );
          setLoading(false);
          return;
        }
      }
    } catch {
      setError('Ocurrió un problema de conexión al validar tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFillDemo = () => {
    setEmail('admin@hospitalquillabamba.gob.pe');
    setPassword('Gest410Admin');
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090E17]/80 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#111827] border border-white/[0.08] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#0F172A] px-6 py-6 border-b border-white/[0.08]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#10B981] text-xs font-semibold mb-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Acceso Administrativo · U.E. 410</span>
              </div>
              <h2
                id="login-modal-title"
                className="text-xl font-bold tracking-tight text-[#F8FAFC]"
              >
                Gest-Deport410
              </h2>
              <p className="text-sm text-[#94A3B8] mt-1">
                Inicia sesión para crear campeonatos, registrar equipos, programar fechas y publicar noticias.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana de acceso"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:bg-white/[0.06] hover:text-[#F8FAFC] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isSupabaseConfigured && (
            <div className="rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 p-3.5 text-xs text-[#E2E8F0] space-y-1.5">
              <p className="font-semibold text-[#10B981]">
                Modo de pruebas local activo (Supabase pendiente en .env.local)
              </p>
              <p className="text-[#94A3B8] leading-relaxed">
                Puedes probar todo el panel ahora mismo con{' '}
                <span className="font-mono font-semibold text-[#F8FAFC]">
                  admin@hospitalquillabamba.gob.pe
                </span>{' '}
                y contraseña{' '}
                <span className="font-mono font-semibold text-[#F8FAFC]">Gest410Admin</span>.
              </p>
              <button
                type="button"
                onClick={handleQuickFillDemo}
                className="text-[#06B6D4] font-semibold underline underline-offset-2 hover:text-[#22D3EE]"
              >
                Autocompletar credenciales de prueba
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3.5 text-sm text-rose-200"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="admin-email"
              className="block text-sm font-medium text-[#F8FAFC] mb-1.5"
            >
              Correo institucional
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@hospitalquillabamba.gob.pe"
              className="w-full h-11 px-3.5 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium text-[#F8FAFC] mb-1.5"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-[#0F172A] border border-white/[0.1] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl border border-white/[0.1] bg-[#1E293B] text-sm font-medium text-[#F8FAFC] hover:bg-[#273549] transition-colors whitespace-nowrap"
            >
              Seguir como espectador
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-5 rounded-xl bg-[#10B981] text-[#022C22] text-sm font-bold hover:bg-[#34D399] disabled:opacity-60 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Verificando...' : 'Ingresar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
