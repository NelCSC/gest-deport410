import { NextRequest } from 'next/server';

interface RateBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateBucket>();

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return '127.0.0.1';
}

/**
 * Rate limiter por ventana deslizante en memoria (por IP y acción).
 */
export function checkRateLimit(
  req: NextRequest,
  scope: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const ip = getClientIp(req);
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  const bucket = buckets.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);

  // Limpieza periódica ligera para evitar crecimiento ilimitado
  if (buckets.size > 2000) {
    for (const [k, b] of buckets.entries()) {
      if (b.timestamps.every((ts) => ts <= cutoff)) {
        buckets.delete(k);
      }
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
