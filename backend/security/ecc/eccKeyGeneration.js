/**
 * CSE447 Security and Cryptography
 * Manual ECC Key Generation
 * 
 * Algorithm:
 * 1. Select private scalar d randomly such that 1 <= d < n.
 * 2. Compute public point Q = d * G using manual scalar multiplication.
 * 3. Public Key: (Qx, Qy), Private Key: d.
 */

import crypto from 'crypto';
import { CURVE, G_POINT, scalarMultiply } from './secp256k1.js';

export function generateECCKeyPair() {
  let privateKeyScalar;

  while (true) {
    const randomBytes = crypto.randomBytes(32);
    privateKeyScalar = BigInt('0x' + randomBytes.toString('hex'));
    if (privateKeyScalar >= 1n && privateKeyScalar < CURVE.n) {
      break;
    }
  }

  const publicKeyPoint = scalarMultiply(privateKeyScalar, G_POINT);

  return {
    publicKey: {
      algorithm: 'ECC-secp256k1',
      x: publicKeyPoint.x.toString(16).padStart(64, '0'),
      y: publicKeyPoint.y.toString(16).padStart(64, '0')
    },
    privateKey: {
      algorithm: 'ECC-secp256k1',
      d: privateKeyScalar.toString(16).padStart(64, '0')
    }
  };
}
