/**
 * CSE447 Security and Cryptography
 * Manual ECC ECDSA Signature Verification
 * 
 * Algorithm:
 * 1. Verify r, s are in [1, n-1].
 * 2. Compute message hash integer z = SHA-256(message).
 * 3. Compute w = s^(-1) mod n.
 * 4. Compute u1 = (z * w) mod n and u2 = (r * w) mod n.
 * 5. Compute point P = u1 * G + u2 * Q.
 * 6. Valid if P != Infinity and (P.x mod n) == r.
 */

import crypto from 'crypto';
import { CURVE, G_POINT, Point, pointAdd, scalarMultiply } from './secp256k1.js';
import { modInverse } from '../math/bigMath.js';

export function verifySignature(message, signatureInput, publicKeyInput) {
  try {
    if (!message || !signatureInput || !publicKeyInput) return false;

    // Parse Signature
    const sig = typeof signatureInput === 'string' ? JSON.parse(signatureInput) : signatureInput;
    if (!sig.r || !sig.s) return false;

    const r = BigInt('0x' + sig.r);
    const s = BigInt('0x' + sig.s);

    if (r <= 0n || r >= CURVE.n || s <= 0n || s >= CURVE.n) {
      return false;
    }

    // Parse Public Key Point Q
    const pubKey = typeof publicKeyInput === 'string' ? JSON.parse(publicKeyInput) : publicKeyInput;
    const Q = new Point(BigInt('0x' + pubKey.x), BigInt('0x' + pubKey.y));
    if (Q.isInfinity()) return false;

    // Step 2: Compute hash z
    const msgString = typeof message === 'string' ? message : JSON.stringify(message);
    const hashHex = crypto.createHash('sha256').update(msgString, 'utf8').digest('hex');
    const z = BigInt('0x' + hashHex) % CURVE.n;

    // Step 3: w = s^(-1) mod n
    const w = modInverse(s, CURVE.n);

    // Step 4: u1 = (z * w) mod n, u2 = (r * w) mod n
    const u1 = (z * w) % CURVE.n;
    const u2 = (r * w) % CURVE.n;

    // Step 5: Point P = u1 * G + u2 * Q
    const u1G = scalarMultiply(u1, G_POINT);
    const u2Q = scalarMultiply(u2, Q);
    const P = pointAdd(u1G, u2Q);

    if (P.isInfinity()) return false;

    // Step 6: Verify P.x mod n == r
    const x1 = P.x % CURVE.n;
    return x1 === r;
  } catch (error) {
    console.error('Signature verification error:', error.message);
    return false;
  }
}
