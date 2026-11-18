export const ALLOWED_REACTION_TYPES = ['like', 'love', 'haha', 'wow'] as const;
export type ReactionType = (typeof ALLOWED_REACTION_TYPES)[number];

export interface ReactionMeta {
  type: ReactionType;
  label: string;
  emoji: string;
  activeTextClass: string;
  activeBgClass: string;
  activeBorderClass: string;
}

export const REACTION_OPTIONS: ReactionMeta[] = [
  {
    type: 'like',
    label: 'Me gusta',
    emoji: '👍',
    activeTextClass: 'text-[#0D5C63]',
    activeBgClass: 'bg-teal-50',
    activeBorderClass: 'border-[#0D5C63]/40',
  },
  {
    type: 'love',
    label: 'Me encanta',
    emoji: '❤️',
    activeTextClass: 'text-rose-700',
    activeBgClass: 'bg-rose-50',
    activeBorderClass: 'border-rose-300',
  },
  {
    type: 'haha',
    label: 'Me divierte',
    emoji: '😄',
    activeTextClass: 'text-amber-700',
    activeBgClass: 'bg-amber-50',
    activeBorderClass: 'border-amber-300',
  },
  {
    type: 'wow',
    label: 'Me asombra',
    emoji: '😮',
    activeTextClass: 'text-indigo-700',
    activeBgClass: 'bg-indigo-50',
    activeBorderClass: 'border-indigo-300',
  },
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

export function isAllowedReactionType(value: unknown): value is ReactionType {
  return (
    typeof value === 'string' &&
    (ALLOWED_REACTION_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Elimina caracteres de control peligrosos y neutraliza etiquetas HTML/scripts
 * para prevenir ataques XSS tanto en backend como en frontend.
 */
export function sanitizePlainText(input: string, maxLength: number): string {
  const normalized = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();

  return normalized.slice(0, maxLength);
}

/**
 * Escapa entidades HTML sensibles como capa adicional de defensa.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'gest_deport410_visitor_id';
  try {
    const existing = window.localStorage.getItem(key);
    if (existing && isValidUuid(existing)) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
    window.localStorage.setItem(key, generated);
    return generated;
  } catch {
    return '00000000-0000-4000-8000-000000000000';
  }
}
