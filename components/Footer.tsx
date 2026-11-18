'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#111827] mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <p className="text-center sm:text-left font-medium text-[#CBD5E1]">
          © 2026 U.E 410 Hospital de Quillabamba. Todos los derechos reservados.
        </p>
        <p className="text-center sm:text-right text-[#94A3B8]">
          Comisión Organizadora de Fútbol · Gest-Deport410
        </p>
      </div>
    </footer>
  );
}
