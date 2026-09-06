/**
 * CSE447 Security and Cryptography
 * Manual BigInt Mathematical Utilities for RSA and ECC Primitives
 * 
 * Rules strictly followed:
 * - Pure manual mathematical implementations
 * - Modular arithmetic, GCD, Extended Euclidean Algorithm, Modular Inverse
 * - Miller-Rabin Probabilistic Primality Test
 * - Random BigInt Prime Generation
 */

import crypto from 'crypto';

/**
 * Computes (base^exponent) mod modulus efficiently using binary exponentiation (Square-and-Multiply)
 * Time Complexity: O(log exponent)
 */
export function modPow(base, exponent, modulus) {
  if (modulus === 1n) return 0n;
  let b = BigInt(base) % BigInt(modulus);
  let e = BigInt(exponent);
  const m = BigInt(modulus);
  if (b < 0n) b += m;
  let result = 1n;

  while (e > 0n) {
    if (e & 1n) {
      result = (result * b) % m;
    }
    e >>= 1n;
    b = (b * b) % m;
  }
  return result;
}

/**
 * Extended Euclidean Algorithm
 * Returns { gcd, x, y } such that: a*x + b*y = gcd(a, b)
 */
export function extendedGCD(a, b) {
  let old_r = BigInt(a), r = BigInt(b);
  let old_s = 1n, s = 0n;
  let old_t = 0n, t = 1n;

  while (r !== 0n) {
    const quotient = old_r / r;
    
    let temp = r;
    r = old_r - quotient * r;
    old_r = temp;

    temp = s;
    s = old_s - quotient * s;
    old_s = temp;

    temp = t;
    t = old_t - quotient * t;
    old_t = temp;
  }

  return { gcd: old_r, x: old_s, y: old_t };
}

/**
 * Computes modular multiplicative inverse of a modulo m: (a^-1) mod m
 * Throws error if gcd(a, m) != 1 (inverse doesn't exist)
 */
export function modInverse(a, m) {
  const { gcd, x } = extendedGCD(a, m);
  if (gcd !== 1n) {
    throw new Error(`Modular inverse does not exist for a=${a}, m=${m} (gcd is ${gcd})`);
  }
  const mod = BigInt(m);
  return (x % mod + mod) % mod;
}

/**
 * Greatest Common Divisor
 */
export function gcd(a, b) {
  let x = BigInt(a) < 0n ? -BigInt(a) : BigInt(a);
  let y = BigInt(b) < 0n ? -BigInt(b) : BigInt(b);
  while (y !== 0n) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

/**
 * Generates a cryptographically random BigInt of given bit length
 */
export function randomBigInt(bits) {
  const bytes = Math.ceil(bits / 8);
  const buf = crypto.randomBytes(bytes);
  let hex = buf.toString('hex');
  let num = BigInt('0x' + hex);
  // Ensure the highest bit is set so the number has the exact bit length
  const mask = 1n << BigInt(bits - 1);
  num = num | mask;
  // Ensure odd number
  num = num | 1n;
  return num;
}

/**
 * Miller-Rabin Primality Test
 * Tests if n is likely prime using k rounds of random bases
 * Probability of false positive is <= 4^(-k)
 */
export function isProbablePrime(n, rounds = 32) {
  const num = BigInt(n);
  if (num <= 1n) return false;
  if (num <= 3n) return true;
  if ((num & 1n) === 0n) return false;

  // Write num - 1 as 2^s * d
  let d = num - 1n;
  let s = 0n;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s += 1n;
  }

  // Witness loop
  for (let i = 0; i < rounds; i++) {
    // Generate random base a in [2, num - 2]
    const a = 2n + (randomBigInt(Number(num.toString(2).length - 1)) % (num - 3n));
    let x = modPow(a, d, num);

    if (x === 1n || x === num - 1n) continue;

    let composite = true;
    for (let r = 1n; r < s; r++) {
      x = (x * x) % num;
      if (x === num - 1n) {
        composite = false;
        break;
      }
    }

    if (composite) return false;
  }

  return true;
}

/**
 * Generates a large probable prime of specified bit length
 */
export function generatePrime(bits = 512) {
  while (true) {
    const candidate = randomBigInt(bits);
    if (isProbablePrime(candidate, 32)) {
      return candidate;
    }
  }
}
