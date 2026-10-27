import { NextRequest } from 'next/server';

const SHARED_SECRET_HEADER = 'x-paa-secret-key';

/**
 * Validates the shared secret header against PAA_SHARED_SECRET env var.
 * If PAA_SHARED_SECRET is not set, a default development secret is accepted.
 */
export function validateSharedSecret(req: NextRequest): { valid: boolean; reason?: string } {
  const expectedSecret = process.env.PAA_SHARED_SECRET || 'paa-dev-secret';
  const providedSecret = req.headers.get(SHARED_SECRET_HEADER);

  if (!providedSecret) {
    return { valid: false, reason: `Missing ${SHARED_SECRET_HEADER} header` };
  }

  if (providedSecret !== expectedSecret) {
    return { valid: false, reason: 'Invalid shared secret' };
  }

  return { valid: true };
}
