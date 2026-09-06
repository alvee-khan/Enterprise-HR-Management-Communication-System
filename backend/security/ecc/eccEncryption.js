/**
 * CSE447 Security and Cryptography
 * Manual ECC ElGamal Encryption & Decryption
 *
 * Algorithm (ElGamal on Elliptic Curves):
 * ─────────────────────────────────────────
 * Key Setup:
 *   Private key: scalar d  (random in [1, n-1])
 *   Public key:  point Q = d * G
 *
 * Encryption of message M (encoded as a curve point):
 *   1. Pick random ephemeral scalar k in [1, n-1]
 *   2. C1 = k * G         (ephemeral public key)
 *   3. S  = k * Q         (shared secret point, using recipient public key)
 *   4. C2 = M + S         (mask the message point with shared secret)
 *   Output ciphertext: (C1, C2)
 *
 * Decryption with private key d:
 *   1. S  = d * C1        (recover shared secret: d*k*G = k*(d*G) = k*Q)
 *   2. M  = C2 - S        (unmask: M + S - S = M)
 *
 * Message Embedding (Koblitz-like method on secp256k1):
 *   secp256k1 curve: y² = x³ + 7  (mod p)
 *   Since p ≡ 3 (mod 4): sqrt(a) = a^((p+1)/4) mod p
 *   For chunk value c: try x = c * MULTIPLIER + j  for j = 0 .. MULTIPLIER-1
 *   until y² = x³ + 7 has a solution (i.e. a quadratic residue exists).
 *   Record j so we can recover c = (x - j) / MULTIPLIER on decryption.
 *
 * Requirements satisfied:
 *   ✅ Req 9:  Exclusively asymmetric (ECC ElGamal)
 *   ✅ Req 10: Second asymmetric algorithm (RSA = user data, ECC = posts)
 *   ✅ Req 13: Implemented 100% from scratch using manual ECC arithmetic
 */

import crypto from 'crypto';
import { CURVE, G_POINT, Point, pointAdd, scalarMultiply } from './secp256k1.js';
import { modPow } from '../math/bigMath.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Bytes per plaintext chunk.
 *  Max chunk BigInt ≤ 2^232 – 1
 *  chunk * MULTIPLIER + (MULTIPLIER-1) must stay < p (≈ 2^256) → 2^232 * 32 ≈ 2^237 << 2^256  ✓
 */
const CHUNK_SIZE   = 29;           // bytes
const MULTIPLIER   = 32n;          // Koblitz embedding multiplier

// ─── Finite-field helpers ─────────────────────────────────────────────────────

/**
 * Compute modular square root mod p (secp256k1).
 * Because secp256k1 prime p ≡ 3 (mod 4):
 *   sqrt(a) = a^((p+1)/4) mod p
 * Returns null if a is not a quadratic residue.
 */
function modSqrt(a, p) {
  if (a === 0n) return 0n;
  const exp = (p + 1n) / 4n;
  const r   = modPow(a, exp, p);
  // Verify that r² ≡ a (mod p)
  if ((r * r) % p !== ((a % p) + p) % p) return null;
  return r;
}

/**
 * Negate a point P on the curve:  –P = (P.x, p – P.y)
 */
function pointNegate(P) {
  if (P.isInfinity()) return P;
  return new Point(P.x, CURVE.p - P.y);
}

// ─── Koblitz-like message embedding ──────────────────────────────────────────

/**
 * Embed a BigInt message chunk as a secp256k1 curve point.
 *
 * Tries x = chunk * MULTIPLIER + j  for j = 0, 1, …, MULTIPLIER-1
 * until y² = x³ + 7 (mod p) has a solution.
 *
 * @param {BigInt} chunk  - message chunk as a non-negative BigInt
 * @returns {{ point: Point, j: BigInt }}
 */
function embedToPoint(chunk) {
  const { p, b } = CURVE; // secp256k1: a = 0, b = 7

  for (let j = 0n; j < MULTIPLIER; j++) {
    const x   = chunk * MULTIPLIER + j;
    if (x >= p) continue;

    // y² = x³ + b  (mod p)
    const y_sq = (modPow(x, 3n, p) + b) % p;
    const y    = modSqrt(y_sq, p);

    if (y !== null) {
      return { point: new Point(x, y), j };
    }
  }

  throw new Error(`[ECC-ELGAMAL] Failed to embed chunk as curve point. Chunk=${chunk.toString(16)}`);
}

/**
 * Extract the original chunk BigInt from the decoded message point and j offset.
 *
 * @param {Point}  point - recovered message point
 * @param {BigInt} j     - Koblitz offset stored alongside ciphertext
 * @returns {BigInt}
 */
function extractFromPoint(point, j) {
  return (point.x - j) / MULTIPLIER;
}

// ─── ECC ElGamal Encryption ───────────────────────────────────────────────────

/**
 * Encrypt a plaintext string using ECC ElGamal (secp256k1).
 *
 * @param {string|object} plaintext     - data to encrypt
 * @param {object|string} publicKeyInput - ECC public key { x, y } (hex strings) or JSON string
 * @returns {string} JSON-serialised ciphertext envelope  (version + blocks array)
 */
export function eccElGamalEncrypt(plaintext, publicKeyInput) {
  if (plaintext === null || plaintext === undefined) return null;

  const pubKey = typeof publicKeyInput === 'string' ? JSON.parse(publicKeyInput) : publicKeyInput;
  const Q      = new Point(BigInt('0x' + pubKey.x), BigInt('0x' + pubKey.y));

  // Serialise plaintext to UTF-8 bytes
  const textToEncrypt = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const msgBytes      = Buffer.from(textToEncrypt, 'utf8');

  const encryptedBlocks = [];

  // ─── Process each CHUNK_SIZE-byte slice ───────────────────────────────────
  for (let offset = 0; offset < msgBytes.length; offset += CHUNK_SIZE) {
    const slice      = msgBytes.subarray(offset, Math.min(offset + CHUNK_SIZE, msgBytes.length));
    const actualLen  = slice.length;   // real byte count in this chunk (may be < CHUNK_SIZE)

    // Zero-pad to CHUNK_SIZE bytes so it fits our fixed embedding range
    const padded    = Buffer.alloc(CHUNK_SIZE, 0);
    slice.copy(padded);

    const chunkBigInt = BigInt('0x' + padded.toString('hex'));

    // 1. Embed chunk as curve point M
    const { point: M, j } = embedToPoint(chunkBigInt);

    // 2. Generate ephemeral scalar k  ∈  [1, n-1]
    let k;
    do {
      const kBytes = crypto.randomBytes(32);
      k = BigInt('0x' + kBytes.toString('hex')) % CURVE.n;
    } while (k <= 0n);

    // 3. C1 = k * G
    const C1 = scalarMultiply(k, G_POINT);

    // 4. S = k * Q  (shared secret)
    const S  = scalarMultiply(k, Q);

    // 5. C2 = M + S
    const C2 = pointAdd(M, S);

    encryptedBlocks.push({
      C1:  C1.toJSON(),
      C2:  C2.toJSON(),
      j:   j.toString(),
      len: actualLen          // actual byte count needed for correct un-padding
    });
  }

  return JSON.stringify({
    version:    'ECC-ELGAMAL-CSE447',
    algorithm:  'secp256k1-ElGamal',
    totalBytes: msgBytes.length,
    blocks:     encryptedBlocks
  });
}

// ─── ECC ElGamal Decryption ───────────────────────────────────────────────────

/**
 * Decrypt an ECC ElGamal ciphertext using the private key scalar d.
 *
 * @param {string|object} ciphertextInput - JSON ciphertext envelope from eccElGamalEncrypt()
 * @param {object|string} privateKeyInput - ECC private key { d } (hex string) or JSON string
 * @returns {string} Original plaintext
 */
export function eccElGamalDecrypt(ciphertextInput, privateKeyInput) {
  if (!ciphertextInput) return null;

  const privKey = typeof privateKeyInput === 'string' ? JSON.parse(privateKeyInput) : privateKeyInput;
  const d       = BigInt('0x' + privKey.d);

  let payload;
  try {
    payload = typeof ciphertextInput === 'string' ? JSON.parse(ciphertextInput) : ciphertextInput;
  } catch {
    throw new Error('[ECC-ELGAMAL] Invalid ciphertext format – expected JSON string');
  }

  if (!payload || !Array.isArray(payload.blocks)) {
    throw new Error('[ECC-ELGAMAL] Corrupted ciphertext envelope – missing blocks array');
  }

  const decryptedChunks = [];

  for (const block of payload.blocks) {
    const C1  = Point.fromJSON(block.C1);
    const C2  = Point.fromJSON(block.C2);
    const j   = BigInt(block.j);
    const len = Number(block.len);

    // 1. Recover shared secret: S = d * C1 = d*k*G = k*(d*G) = k*Q
    const S       = scalarMultiply(d, C1);

    // 2. Recover message point: M = C2 – S = C2 + (–S)
    const S_neg   = pointNegate(S);
    const M       = pointAdd(C2, S_neg);

    // 3. Extract chunk BigInt from message point
    const chunkBigInt = extractFromPoint(M, j);

    // 4. Convert BigInt → zero-padded CHUNK_SIZE buffer, then take only `len` bytes
    let hexStr = chunkBigInt.toString(16);
    if (hexStr.length % 2 !== 0) hexStr = '0' + hexStr;
    const chunkBuffer = Buffer.from(hexStr.padStart(CHUNK_SIZE * 2, '0'), 'hex');
    decryptedChunks.push(chunkBuffer.subarray(0, len));
  }

  return Buffer.concat(decryptedChunks).toString('utf8');
}
