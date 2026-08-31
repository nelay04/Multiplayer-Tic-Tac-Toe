import { hash, verify } from '@node-rs/argon2';

/**
 * OWASP's "strong" Argon2id profile (64 MiB memory, 3 passes, 4 lanes).
 * Deliberately heavier than the minimum profile since auth here is low-volume.
 */
const HASH_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, HASH_OPTIONS);
}

/**
 * Verifies a password against a stored value that may still be a legacy
 * plaintext password from before hashing was introduced. `needsRehash` tells
 * the caller to overwrite the stored value with a proper hash once verified,
 * migrating existing accounts on their next successful login instead of
 * requiring a separate migration pass or locking anyone out.
 */
export async function verifyPassword(
  stored: string,
  plain: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!stored.startsWith('$argon2')) {
    return { valid: stored === plain, needsRehash: stored === plain };
  }
  const valid = await verify(stored, plain);
  return { valid, needsRehash: false };
}
