// Simple in-memory sliding window rate limiter
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter for backend proxy protection.
 * @param identifier Client identifier (IP or auth token)
 * @param limit Max allowed requests within windowMs
 * @param windowMs Time window in milliseconds (default: 60s)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier) || { timestamps: [] };

  // Remove timestamps older than window
  const recent = record.timestamps.filter((ts) => now - ts < windowMs);

  if (recent.length >= limit) {
    rateLimitStore.set(identifier, { timestamps: recent });
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  rateLimitStore.set(identifier, { timestamps: recent });
  return { allowed: true, remaining: limit - recent.length };
}
