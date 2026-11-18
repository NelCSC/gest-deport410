'use client';

import { useEffect } from 'react';

/**
 * Bloquea el scroll del documento de fondo mientras un modal está abierto
 * para evitar desplazamientos accidentales detrás de la ventana flotante.
 */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [locked]);
}
