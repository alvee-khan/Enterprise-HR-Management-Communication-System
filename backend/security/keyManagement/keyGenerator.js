/**
 * CSE447 Security and Cryptography
 * Key Management: Key Generator
 *
 * Generates enterprise cryptographic key pairs (RSA & ECC) with metadata,
 * purpose tags, validity periods, and unique key identifiers.
 *
 * Private keys are KEK-wrapped before returning – never stored as plaintext JSON.
 *
 * Requirements satisfied:
 *   ✅ Req 5:  Key Management – generation with validity & rotation dates
 *   ✅ Req 7:  Private keys wrapped with KEK before storage
 */

import { v4 as uuidv4 } from 'uuid';
import { generateRSAKeyPair } from '../rsa/rsaKeyGeneration.js';
import { generateECCKeyPair } from '../ecc/eccKeyGeneration.js';
import { wrapPrivateKey } from './keyWrapping.js';

export function generateCryptographicKey({
  algorithm   = 'RSA',
  purpose     = 'encryption',
  userId      = null,
  companyId   = null,
  validityDays = 90
}) {
  const keyId       = uuidv4();
  const createdAt   = new Date();
  const rotationDate = new Date(createdAt.getTime() + validityDays * 24 * 60 * 60 * 1000);
  const expiresAt   = new Date(createdAt.getTime() + (validityDays + 30) * 24 * 60 * 60 * 1000);

  let keyPair;
  if (algorithm === 'RSA') {
    keyPair = generateRSAKeyPair(512);
  } else if (algorithm === 'ECC') {
    keyPair = generateECCKeyPair();
  } else {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  // ── Wrap the private key with KEK before returning (Req 7) ──────────────────
  const wrappedPrivateKey = wrapPrivateKey(JSON.stringify(keyPair.privateKey));

  return {
    keyId,
    algorithm,
    purpose,
    userId,
    companyId,
    publicKey:           JSON.stringify(keyPair.publicKey),
    protectedPrivateKey: wrappedPrivateKey,   // KEK-wrapped, not plaintext
    createdAt,
    rotationDate,
    expiresAt,
    status: 'active',
    metadata: {
      keySizeBits:  keyPair.publicKey.keySizeBits || 256,
      generatedBy:  'HRMS_Security_Subsystem',
      version:      '2.0',
      keyWrapping:  'HMAC-KEK'
    }
  };
}
