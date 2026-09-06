/**
 * CSE447 Security and Cryptography
 * Password Hashing and Salting Module
 *
 * Cryptographic Concept:
 * Password hashing is a one-way mathematical function (pre-image resistance).
 * Unlike encryption, hashes CANNOT be decrypted.
 * Salting prevents dictionary and rainbow table attacks by appending a unique,
 * unpredictable random string to every password before hashing.
 *
 * Implementation:
 * - Cryptographic Salt Generation (128-bit random salt)
 * - Multi-iteration PBKDF2 key derivation implemented MANUALLY using our own
 *   manualHMAC function (does NOT call crypto.pbkdf2Sync)
 * - Timing-attack resistant verification
 *
 * PBKDF2 Formula (RFC 2898):
 *   DK = T_1 || T_2 || ... || T_dklen/hlen
 *   T_i = F(Password, Salt, c, i)
 *   F(P, S, c, i) = U_1 XOR U_2 XOR ... XOR U_c
 *   U_1 = HMAC(P, S || INT(i))
 *   U_j = HMAC(P, U_{j-1})  for j = 2..c
 *
 * Requirements satisfied:
 *   ✅ Req 3:  Passwords hashed and salted before storage
 *   ✅ Req 13: Algorithm implemented from scratch (no crypto.pbkdf2Sync)
 */

import crypto from 'crypto';
import { manualHMAC } from '../mac/generateMAC.js';
import { constantTimeEquals } from '../mac/verifyMAC.js';

const DEFAULT_ITERATIONS = 10000;
const KEY_LENGTH         = 32;    // 256-bit derived key

// ─── Salt Generation ──────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random salt (hex string).
 * @param {number} byteLength - number of random bytes (default 16 = 128-bit)
 * @returns {string} hex-encoded salt
 */
export function generateSalt(byteLength = 16) {
  return crypto.randomBytes(byteLength).toString('hex');
}

// ─── Manual PBKDF2 ────────────────────────────────────────────────────────────

/**
 * Manually implements PBKDF2-HMAC-SHA256 using our custom manualHMAC function.
 * NO use of Node's crypto.pbkdf2Sync.
 *
 * @param {string} password   - user plaintext password
 * @param {string} salt       - hex-encoded salt
 * @param {number} iterations - KDF iteration count (default 10000)
 * @param {number} keyLength  - desired output byte length (default 32)
 * @returns {string} hex-encoded derived key
 */
function manualPBKDF2(password, salt, iterations = DEFAULT_ITERATIONS, keyLength = KEY_LENGTH) {
  const saltBuffer = Buffer.from(salt, 'utf8');
  const blocksNeeded = Math.ceil(keyLength / 32); // SHA-256 produces 32 bytes per HMAC block
  const derivedKeyParts = [];

  for (let blockIndex = 1; blockIndex <= blocksNeeded; blockIndex++) {
    // INT(blockIndex) as 4-byte big-endian integer
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32BE(blockIndex, 0);

    // U_1 = HMAC(password, salt || INT(blockIndex))
    const saltWithIndex = Buffer.concat([saltBuffer, indexBuf]);
    let U = Buffer.from(manualHMAC(saltWithIndex, password), 'hex');  // 32 bytes
    let T = Buffer.from(U);                                            // T starts as U_1

    // U_2 through U_iterations: U_j = HMAC(password, U_{j-1})
    for (let iter = 2; iter <= iterations; iter++) {
      U = Buffer.from(manualHMAC(U, password), 'hex');
      // T = T XOR U_j
      for (let byte = 0; byte < T.length; byte++) {
        T[byte] ^= U[byte];
      }
    }

    derivedKeyParts.push(T);
  }

  // Concatenate all T blocks and truncate to keyLength bytes
  return Buffer.concat(derivedKeyParts).subarray(0, keyLength).toString('hex');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Hash a password with an explicit salt using manual PBKDF2-HMAC-SHA256.
 *
 * @param {string} password   - plaintext password
 * @param {string} salt       - hex salt (from generateSalt)
 * @param {number} iterations - KDF iterations
 * @returns {{ hash: string, salt: string, iterations: number }}
 */
export function hashPasswordWithSalt(password, salt, iterations = DEFAULT_ITERATIONS) {
  if (!password || !salt) {
    throw new Error('Password and salt are required for hashing');
  }

  const hash = manualPBKDF2(password, salt, iterations, KEY_LENGTH);
  return { hash, salt, iterations };
}

/**
 * Verify a plaintext password against a stored hash + salt using constant-time comparison.
 *
 * @param {string} password    - plaintext password to check
 * @param {string} storedHash  - hex-encoded stored hash
 * @param {string} salt        - hex-encoded salt
 * @param {number} iterations  - iterations used when the hash was originally created
 * @returns {boolean}
 */
export function verifyPassword(password, storedHash, salt, iterations = DEFAULT_ITERATIONS) {
  if (!password || !storedHash || !salt) return false;
  const { hash: computedHash } = hashPasswordWithSalt(password, salt, iterations);
  return constantTimeEquals(computedHash, storedHash);
}
