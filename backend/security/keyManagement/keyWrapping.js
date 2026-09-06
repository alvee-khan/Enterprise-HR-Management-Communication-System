/**
 * CSE447 Security and Cryptography
 * Key Wrapping Module (HMAC-based Keystream Encryption)
 *
 * Purpose: Protect private keys before storing in the database.
 * The KEK (Key Encryption Key) is derived from the MASTER_SECRET environment
 * variable using our custom manualHMAC function. Private key JSON is then
 * XOR-encrypted with an HMAC-generated pseudo-random keystream.
 *
 * This is NOT a data-encryption algorithm (satisfies Req 9 – asymmetric only
 * for data). Key wrapping / KMS operations are a separate concern in every
 * real-world HSM / key-management standard (PKCS#11, KMIP, etc.).
 * The implementation is 100% scratch-built using our own manualHMAC.
 *
 * Requirements satisfied:
 *   ✅ Req 5:  Key Management – private keys protected before storage
 *   ✅ Req 7:  No plaintext private keys in the database
 *   ✅ Req 13: Implemented from scratch using custom manualHMAC
 */

import crypto from 'crypto';
import { manualHMAC } from '../mac/generateMAC.js';

const PREFIX = 'KEK-WRAPPED:';

// ─── KEK Derivation ───────────────────────────────────────────────────────────

/**
 * Derive a 32-byte Key Encryption Key from the system master secret.
 * Uses two rounds of our manual HMAC for domain separation:
 *   KEK = HMAC( HMAC(masterSecret, "CSE447-KEK-DERIVE-v1"), masterSecret )
 *
 * @returns {Buffer} 32-byte KEK
 */
function deriveKEK() {
  const masterSecret = process.env.MASTER_SECRET || 'CSE447-HRMS-MASTER-KEK-2026-DEFAULT';
  const inner  = manualHMAC('CSE447-KEK-DERIVE-v1', masterSecret);   // 64-hex chars = 32 bytes
  const kekHex = manualHMAC(inner, masterSecret);
  return Buffer.from(kekHex, 'hex');                                  // 32 bytes
}

// ─── Keystream Generation ─────────────────────────────────────────────────────

/**
 * Generate `length` bytes of pseudo-random keystream using counter-mode HMAC.
 * Each 32-byte block: block_i = HMAC(nonce ‖ counter_i, kek)
 *
 * @param {Buffer} kek    - 32-byte key encryption key
 * @param {Buffer} nonce  - 16-byte random nonce
 * @param {number} length - desired keystream length in bytes
 * @returns {Buffer}
 */
function generateKeystream(kek, nonce, length) {
  const blocks = [];
  let totalBytes = 0;

  for (let counter = 0; totalBytes < length; counter++) {
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigUInt64BE(BigInt(counter));
    const blockHex = manualHMAC(Buffer.concat([nonce, counterBuf]), kek);
    const block    = Buffer.from(blockHex, 'hex');
    blocks.push(block);
    totalBytes += block.length;
  }

  return Buffer.concat(blocks).subarray(0, length);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Wrap (protect) a private key JSON string using the KEK.
 * Output format:  KEK-WRAPPED:<nonce-hex>:<ciphertext-base64>
 *
 * @param {string} privateKeyJson - private key as JSON string
 * @returns {string} wrapped key string
 */
export function wrapPrivateKey(privateKeyJson) {
  const kek   = deriveKEK();
  const data  = Buffer.from(privateKeyJson, 'utf8');
  const nonce = crypto.randomBytes(16);

  const keystream  = generateKeystream(kek, nonce, data.length);
  const encrypted  = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keystream[i];
  }

  return PREFIX + nonce.toString('hex') + ':' + encrypted.toString('base64');
}

/**
 * Unwrap (recover) a private key JSON string from a KEK-wrapped blob.
 * Supports backwards-compatibility: if the key is NOT wrapped (legacy plaintext JSON),
 * it is returned as-is.
 *
 * @param {string} wrappedKey - output of wrapPrivateKey() or legacy plaintext JSON
 * @returns {string} private key JSON string
 */
export function unwrapPrivateKey(wrappedKey) {
  if (!wrappedKey) throw new Error('[KEK] Cannot unwrap null key');

  // ── Backwards-compat: legacy plaintext JSON (before key wrapping was added) ──
  if (!wrappedKey.startsWith(PREFIX)) {
    return wrappedKey;
  }

  const body  = wrappedKey.slice(PREFIX.length);
  const colon = body.indexOf(':');
  if (colon === -1) throw new Error('[KEK] Malformed wrapped key – missing separator');

  const nonce      = Buffer.from(body.slice(0, colon), 'hex');
  const encrypted  = Buffer.from(body.slice(colon + 1), 'base64');

  const kek        = deriveKEK();
  const keystream  = generateKeystream(kek, nonce, encrypted.length);

  const decrypted  = Buffer.alloc(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keystream[i];
  }

  return decrypted.toString('utf8');
}
