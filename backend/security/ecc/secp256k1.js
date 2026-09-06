/**
 * CSE447 Security and Cryptography
 * Manual Elliptic Curve Arithmetic over Finite Field (secp256k1 parameters)
 * 
 * Curve Equation: y^2 = x^3 + 7 (mod p)
 * 
 * Implemented manually:
 * - Finite field modular addition, subtraction, multiplication, inversion
 * - Elliptic Curve Point Addition
 * - Elliptic Curve Point Doubling
 * - Elliptic Curve Scalar Multiplication (Double-and-Add)
 */

import { modInverse } from '../math/bigMath.js';

export const CURVE = {
  // Prime modulus p = 2^256 - 2^32 - 977
  p: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'),
  // Curve coefficients y^2 = x^3 + ax + b
  a: 0n,
  b: 7n,
  // Base generator point G = (Gx, Gy)
  Gx: BigInt('0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
  Gy: BigInt('0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8'),
  // Order of base point n
  n: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141')
};

export class Point {
  constructor(x, y) {
    this.x = x !== null ? BigInt(x) : null;
    this.y = y !== null ? BigInt(y) : null;
  }

  isInfinity() {
    return this.x === null || this.y === null;
  }

  equals(other) {
    if (!other) return false;
    if (this.isInfinity() && other.isInfinity()) return true;
    if (this.isInfinity() || other.isInfinity()) return false;
    return this.x === other.x && this.y === other.y;
  }

  toJSON() {
    if (this.isInfinity()) return { x: null, y: null };
    return {
      x: this.x.toString(16).padStart(64, '0'),
      y: this.y.toString(16).padStart(64, '0')
    };
  }

  static fromJSON(json) {
    if (!json || json.x === null || json.y === null) return new Point(null, null);
    return new Point(BigInt('0x' + json.x), BigInt('0x' + json.y));
  }
}

export const G_POINT = new Point(CURVE.Gx, CURVE.Gy);
export const INFINITY = new Point(null, null);

/**
 * Point doubling: R = 2P on curve
 */
export function pointDouble(P) {
  if (P.isInfinity() || P.y === 0n) return INFINITY;

  const { p, a } = CURVE;
  // lambda = (3 * x^2 + a) / (2 * y) mod p
  const numerator = (3n * P.x * P.x + a) % p;
  const denominator = (2n * P.y) % p;
  const invDenom = modInverse(denominator, p);
  const lambda = (numerator * invDenom) % p;

  // Rx = lambda^2 - 2 * Px mod p
  let rx = (lambda * lambda - 2n * P.x) % p;
  if (rx < 0n) rx += p;

  // Ry = lambda * (Px - Rx) - Py mod p
  let ry = (lambda * (P.x - rx) - P.y) % p;
  if (ry < 0n) ry += p;

  return new Point(rx, ry);
}

/**
 * Point addition: R = P + Q on curve
 */
export function pointAdd(P, Q) {
  if (P.isInfinity()) return Q;
  if (Q.isInfinity()) return P;

  const { p } = CURVE;

  if (P.x === Q.x) {
    if (P.y === Q.y) {
      return pointDouble(P);
    } else {
      // P + (-P) = Point at Infinity
      return INFINITY;
    }
  }

  // lambda = (Qy - Py) / (Qx - Px) mod p
  let num = (Q.y - P.y) % p;
  if (num < 0n) num += p;
  let den = (Q.x - P.x) % p;
  if (den < 0n) den += p;

  const invDen = modInverse(den, p);
  const lambda = (num * invDen) % p;

  // Rx = lambda^2 - Px - Qx mod p
  let rx = (lambda * lambda - P.x - Q.x) % p;
  if (rx < 0n) rx += p;

  // Ry = lambda * (Px - Rx) - Py mod p
  let ry = (lambda * (P.x - rx) - P.y) % p;
  if (ry < 0n) ry += p;

  return new Point(rx, ry);
}

/**
 * Scalar multiplication: R = k * P using Double-and-Add algorithm
 * Time Complexity: O(log k)
 */
export function scalarMultiply(k, P) {
  let scalar = BigInt(k) % CURVE.n;
  if (scalar === 0n || P.isInfinity()) return INFINITY;

  let result = INFINITY;
  let addend = P;

  while (scalar > 0n) {
    if (scalar & 1n) {
      result = pointAdd(result, addend);
    }
    addend = pointDouble(addend);
    scalar >>= 1n;
  }

  return result;
}
