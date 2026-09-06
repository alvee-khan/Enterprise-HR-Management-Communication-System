/**
 * CSE447 Security and Cryptography
 * Manual ECC ECDSA Digital Signature Generation
 * 
 * Algorithm:
 * 1. Compute message hash integer z = SHA-256(message).
 * 2. Generate random ephemeral secret k in [1, n-1].
 * 3. Compute point (x1, y1) = k * G.
 * 4. Compute r = x1 mod n. (If r == 0, choose another k).
 * 5. Compute s = k^(-1) * (z + r * d) mod n. (If s == 0, choose another k).
 * 6. Return digital signature (r, s).
 */

import crypto from 'crypto';
import { CURVE, G_POINT, scalarMultiply } from './secp256k1.js';
import { modInverse } from '../math/bigMath.js';

export function signMessage(message, privateKeyInput) {
  if (message === null || message === undefined) {
    throw new Error('Message to sign cannot be null');
  }

  const d = typeof privateKeyInput === 'object' && privateKeyInput.d
    ? BigInt('0x' + privateKeyInput.d)
    : BigInt('0x' + privateKeyInput);

  // Step 1: Compute hash z
  const msgString = typeof message === 'string' ? message : JSON.stringify(message);
  const hashHex = crypto.createHash('sha256').update(msgString, 'utf8').digest('hex');
  const z = BigInt('0x' + hashHex) % CURVE.n;

  let r, s, k;

  while (true) {
    // Step 2: Random ephemeral key k
    const kBytes = crypto.randomBytes(32);
    k = BigInt('0x' + kBytes.toString('hex')) % CURVE.n;
    if (k <= 0n) continue;

    // Step 3: Compute point (x1, y1) = k * G
    const kG = scalarMultiply(k, G_POINT);
    if (kG.isInfinity()) continue;

    // Step 4: r = x1 mod n
    r = kG.x % CURVE.n;
    if (r === 0n) continue;

    // Step 5: s = k^(-1) * (z + r * d) mod n
    const kInv = modInverse(k, CURVE.n);
    s = (kInv * (z + ((r * d) % CURVE.n))) % CURVE.n;
    if (s === 0n) continue;

    // Canonical low-s to prevent signature malleability
    if (s > CURVE.n / 2n) {
      s = CURVE.n - s;
    }

    break;
  }

  return JSON.stringify({
    r: r.toString(16).padStart(64, '0'),
    s: s.toString(16).padStart(64, '0'),
    algorithm: 'ECDSA-secp256k1'
  });
}
