import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Chat messages are stored encrypted at rest so a database dump (or a leaked
 * Atlas backup) does not expose what players said to each other. AES-256-GCM is
 * used rather than a plain cipher because it also authenticates the ciphertext:
 * a tampered or relocated row fails to decrypt instead of silently returning
 * altered text.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit nonce, the size GCM is specified for
const VERSION = 'v1';

let cachedKey: Buffer | null = null;

/**
 * Accepts either 64 hex characters or a 44-character base64 string, both of
 * which encode the required 32 bytes. Resolved lazily and cached so importing
 * this module never throws at import time.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.CHAT_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'CHAT_ENCRYPTION_KEY environment variable is required for chat. ' +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');

  if (key.length !== 32) {
    throw new Error(
      `CHAT_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). ` +
        'Provide 64 hex characters or a base64-encoded 32-byte key.'
    );
  }

  cachedKey = key;
  return key;
}

/**
 * Fails fast at boot rather than on the first chat message, so a misconfigured
 * key is caught by the deploy instead of by a player mid-match.
 */
export function assertEncryptionKey(): void {
  getKey();
}

/**
 * The additional authenticated data binds a ciphertext to the game and sender
 * it was written for. It is not encrypted, but altering either field in the
 * database invalidates the auth tag, so messages cannot be moved between
 * conversations or reattributed to another player.
 */
function aad(gameId: string, sender: string): Buffer {
  return Buffer.from(`${gameId}|${sender}`, 'utf8');
}

/** Returns a self-describing `v1:iv:tag:ciphertext` envelope, all base64. */
export function encryptMessage(plain: string, gameId: string, sender: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  cipher.setAAD(aad(gameId, sender));
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

/**
 * Returns null instead of throwing when a row cannot be decrypted (unknown
 * envelope version, rotated key, tampered data). A single unreadable message
 * should degrade to a placeholder in the transcript, not break the whole
 * chat history request.
 */
export function decryptMessage(envelope: string, gameId: string, sender: string): string | null {
  try {
    const [version, ivB64, tagB64, ciphertextB64] = envelope.split(':');
    if (version !== VERSION || !ivB64 || !tagB64 || !ciphertextB64) return null;

    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAAD(aad(gameId, sender));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}
