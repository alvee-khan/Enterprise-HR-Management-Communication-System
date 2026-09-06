/**
 * CSE447 Security and Cryptography
 * Key Management: Key Storage
 *
 * Persists and retrieves public and KEK-protected private keys in PostgreSQL.
 * Private keys are automatically unwrapped on retrieval using keyWrapping.js.
 *
 * Requirements satisfied:
 *   ✅ Req 5:  Key storage & retrieval
 *   ✅ Req 7:  Private keys never returned as plaintext from DB
 */

import prisma from '../../config/prisma.js';
import { unwrapPrivateKey } from './keyWrapping.js';

/**
 * Unwrap the protected_private_key field from a DB record.
 * Adds a `private_key_json` helper field with the unwrapped JSON string.
 * @param {object} keyRecord - Prisma CryptographicKey record
 * @returns {object} record with added `private_key_json` string
 */
export function getUnwrappedPrivateKey(keyRecord) {
  if (!keyRecord) return null;
  try {
    return unwrapPrivateKey(keyRecord.protected_private_key);
  } catch (err) {
    console.error('[KEY-STORAGE] Failed to unwrap private key:', err.message);
    return null;
  }
}

export async function storeKey(keyData) {
  return await prisma.cryptographicKey.create({
    data: {
      userId:                keyData.userId      ? Number(keyData.userId)      : null,
      companyId:             keyData.companyId   ? Number(keyData.companyId)   : null,
      algorithm:             keyData.algorithm,
      purpose:               keyData.purpose,
      public_key:            keyData.publicKey,
      protected_private_key: keyData.protectedPrivateKey,
      key_id:                keyData.keyId,
      created_at:            keyData.createdAt   || new Date(),
      rotation_date:         keyData.rotationDate,
      expires_at:            keyData.expiresAt,
      status:                keyData.status       || 'active',
      metadata:              keyData.metadata     || {}
    }
  });
}

export async function getActiveKey({ algorithm, purpose, userId = null, companyId = null }) {
  const where = { algorithm, purpose, status: 'active' };
  if (userId)    where.userId    = Number(userId);
  if (companyId) where.companyId = Number(companyId);

  let key = await prisma.cryptographicKey.findFirst({
    where,
    orderBy: { created_at: 'desc' }
  });

  // Fallback: system-level key (no userId / companyId)
  if (!key) {
    key = await prisma.cryptographicKey.findFirst({
      where: { algorithm, purpose, status: 'active', userId: null },
      orderBy: { created_at: 'desc' }
    });
  }

  return key;
}

export async function getKeyById(keyId) {
  return await prisma.cryptographicKey.findUnique({ where: { key_id: keyId } });
}

export async function listAllKeys({ companyId = null, userId = null } = {}) {
  const where = {};
  if (companyId) where.companyId = Number(companyId);
  if (userId)    where.userId    = Number(userId);

  return await prisma.cryptographicKey.findMany({
    where,
    orderBy: { created_at: 'desc' },
    select: {
      id: true, key_id: true, algorithm: true, purpose: true,
      public_key: true, created_at: true, rotation_date: true,
      expires_at: true, status: true, userId: true, companyId: true,
      metadata: true
      // NOTE: protected_private_key intentionally excluded from list responses
    }
  });
}
