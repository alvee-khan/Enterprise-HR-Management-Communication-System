/**
 * CSE447 Security and Cryptography
 * Manual HMAC (Hash-based Message Authentication Code) Implementation
 * 
 * Algorithm:
 * HMAC(K, m) = H((K' XOR opad) || H((K' XOR ipad) || m))
 * 
 * Where:
 * - H is cryptographic hash function (SHA-256)
 * - Block size B = 64 bytes
 * - ipad = 0x36 repeated 64 times
 * - opad = 0x5c repeated 64 times
 * - K' = H(K) if len(K) > B else K padded with zeros to length B
 */

import crypto from 'crypto';

const SYSTEM_MAC_KEY = process.env.MAC_SECRET_KEY || 'HR_TEAM_MANAGEMENT_SYSTEM_INTEGRITY_KEY_2026_CSE447';

export function manualHMAC(message, key = SYSTEM_MAC_KEY) {
  const BLOCK_SIZE = 64; // 64 bytes for SHA-256
  const msgBuffer = Buffer.isBuffer(message) ? message : Buffer.from(typeof message === 'string' ? message : JSON.stringify(message), 'utf8');
  let keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(String(key), 'utf8');

  // Step 1: Normalize key to Block size
  if (keyBuffer.length > BLOCK_SIZE) {
    keyBuffer = crypto.createHash('sha256').update(keyBuffer).digest();
  }
  if (keyBuffer.length < BLOCK_SIZE) {
    const paddedKey = Buffer.alloc(BLOCK_SIZE, 0);
    keyBuffer.copy(paddedKey);
    keyBuffer = paddedKey;
  }

  // Step 2: Create inner and outer padded keys
  const ipad = Buffer.alloc(BLOCK_SIZE, 0x36);
  const opad = Buffer.alloc(BLOCK_SIZE, 0x5c);

  const k_ipad = Buffer.alloc(BLOCK_SIZE);
  const k_opad = Buffer.alloc(BLOCK_SIZE);

  for (let i = 0; i < BLOCK_SIZE; i++) {
    k_ipad[i] = keyBuffer[i] ^ ipad[i];
    k_opad[i] = keyBuffer[i] ^ opad[i];
  }

  // Step 3: Inner hash H((K' XOR ipad) || m)
  const innerHash = crypto.createHash('sha256')
    .update(k_ipad)
    .update(msgBuffer)
    .digest();

  // Step 4: Outer hash H((K' XOR opad) || innerHash)
  const macDigest = crypto.createHash('sha256')
    .update(k_opad)
    .update(innerHash)
    .digest('hex');

  return macDigest;
}

export function generateMAC(data, key) {
  return manualHMAC(data, key);
}
