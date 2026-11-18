import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jakarta',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Gest-Deport410 | Campeonato U.E. 410 Hospital de Quillabamba',
  description:
    'Plataforma de gestión deportiva institucional para campeonatos internos de aniversario de la U.E. 410 Hospital de Quillabamba.',
  openGraph: {
    title: 'Gest-Deport410 | Campeonato U.E. 410 Hospital de Quillabamba',
    description:
      'Programación de encuentros, equipos, noticias y tabla de posiciones en tiempo real del Hospital de Quillabamba.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gest-Deport410 | U.E. 410 Hospital de Quillabamba',
    description:
      'Gestión deportiva institucional para el campeonato de aniversario del Hospital de Quillabamba.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${jakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#090E17] text-[#F8FAFC] antialiased selection:bg-[#10B981]/25 selection:text-[#10B981]"
      >
        {children}
      </body>
    </html>
  );
}
