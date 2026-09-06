/**
 * CSE447 Security and Cryptography
 * Two-Factor Authentication (TOTP - RFC 6238 / HOTP - RFC 4226)
 * 
 * Supports standard Google Authenticator (HMAC-SHA1 default) as well as HMAC-SHA256.
 * Implemented from scratch using manual HMAC algorithm (RFC 2104).
 */

import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % 32];
  }
  return secret;
}

export function base32ToBuffer(base32Str) {
  const cleanStr = base32Str.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < cleanStr.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleanStr[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Custom manual HMAC implementation supporting SHA-1 (Google Authenticator standard)
 * and SHA-256 from scratch.
 */
function manualHMACDigest(messageBuffer, keyBuffer, algorithm = 'sha1') {
  const BLOCK_SIZE = 64; // 64 bytes block size for both SHA-1 and SHA-256
  let key = keyBuffer;

  if (key.length > BLOCK_SIZE) {
    key = crypto.createHash(algorithm).update(key).digest();
  }
  if (key.length < BLOCK_SIZE) {
    const padded = Buffer.alloc(BLOCK_SIZE, 0);
    key.copy(padded);
    key = padded;
  }

  const ipad = Buffer.alloc(BLOCK_SIZE, 0x36);
  const opad = Buffer.alloc(BLOCK_SIZE, 0x5c);

  for (let i = 0; i < BLOCK_SIZE; i++) {
    ipad[i] ^= key[i];
    opad[i] ^= key[i];
  }

  const inner = crypto.createHash(algorithm).update(ipad).update(messageBuffer).digest();
  return crypto.createHash(algorithm).update(opad).update(inner).digest();
}

/**
 * Computes 6-digit TOTP token for given secret and time step counter.
 * Uses SHA-1 by default as strictly required by Google Authenticator app.
 */
export function generateTOTP(secretBase32, timeStep = null, algorithm = 'sha1') {
  const counter = timeStep !== null ? timeStep : Math.floor(Date.now() / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const keyBuffer = base32ToBuffer(secretBase32);

  // Manual HMAC (SHA-1 for Google Authenticator compatibility)
  const hmacBuffer = manualHMACDigest(counterBuffer, keyBuffer, algorithm);

  // Dynamic Truncation (RFC 4226)
  const offset = hmacBuffer[hmacBuffer.length - 1] & 0x0f;
  const binary =
    ((hmacBuffer[offset] & 0x7f) << 24) |
    ((hmacBuffer[offset + 1] & 0xff) << 16) |
    ((hmacBuffer[offset + 2] & 0xff) << 8) |
    (hmacBuffer[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies TOTP code against secret.
 * Checks both SHA-1 (Google Authenticator standard) and SHA-256 fallback with drift tolerance of +- 2 windows (60s).
 */
export function verifyTOTP(token, secretBase32, driftWindows = 2) {
  if (!token || !secretBase32) return false;
  const cleanToken = String(token).trim();
  const currentStep = Math.floor(Date.now() / 1000 / 30);

  for (let i = -driftWindows; i <= driftWindows; i++) {
    // Check Google Authenticator SHA-1 code
    if (generateTOTP(secretBase32, currentStep + i, 'sha1') === cleanToken) {
      return true;
    }
    // Check SHA-256 fallback code
    if (generateTOTP(secretBase32, currentStep + i, 'sha256') === cleanToken) {
      return true;
    }
  }
  return false;
}

/**
 * Generates 8 random single-use backup recovery codes
 */
export function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    codes.push(formatted);
  }
  return codes;
}
