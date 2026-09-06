/**
 * CSE447 Security and Cryptography
 * Manual RSA Key Generation
 * 
 * Algorithm:
 * 1. Choose two distinct large prime numbers p and q using Miller-Rabin test.
 * 2. Compute n = p * q (modulus).
 * 3. Compute Euler's totient phi(n) = (p - 1) * (q - 1).
 * 4. Choose public exponent e such that 1 < e < phi(n) and gcd(e, phi(n)) = 1 (typically 65537).
 * 5. Compute private exponent d = e^(-1) mod phi(n) using Extended Euclidean Algorithm.
 * 6. Public Key: (e, n), Private Key: (d, n).
 */

import { generatePrime, gcd, modInverse } from '../math/bigMath.js';

export function generateRSAKeyPair(keySizeBits = 512) {
  const halfBits = Math.floor(keySizeBits / 2);
  const e = 65537n; // Standard Fermat prime F4

  let p, q, n, phi, d;

  while (true) {
    p = generatePrime(halfBits);
    q = generatePrime(halfBits);

    // Ensure p and q are distinct
    if (p === q) continue;

    n = p * q;
    phi = (p - 1n) * (q - 1n);

    // Ensure gcd(e, phi) = 1
    if (gcd(e, phi) === 1n) {
      try {
        d = modInverse(e, phi);
        break;
      } catch {
        continue;
      }
    }
  }

  return {
    publicKey: {
      e: e.toString(16),
      n: n.toString(16),
      algorithm: 'RSA',
      keySizeBits
    },
    privateKey: {
      d: d.toString(16),
      n: n.toString(16),
      p: p.toString(16),
      q: q.toString(16),
      algorithm: 'RSA',
      keySizeBits
    }
  };
}

/**
 * Serializes key object to JSON string format
 */
export function exportKey(keyObj) {
  return JSON.stringify(keyObj);
}

/**
 * Deserializes key from JSON string format
 */
export function importKey(keyString) {
  if (typeof keyString === 'object' && keyString !== null) return keyString;
  return JSON.parse(keyString);
}
