/**
 * CSE447 Security and Cryptography
 * Key Management: Key Distribution
 * 
 * Securely distributes public keys to clients and authenticates public key certificates.
 */

import prisma from '../../config/prisma.js';
import { getActiveKey, getKeyById } from './keyStorage.js';

export async function getPublicKeyForClient({ algorithm = 'RSA', purpose = 'encryption', userId = null }) {
  const activeKey = await getActiveKey({ algorithm, purpose, userId });
  if (!activeKey) {
    throw new Error(`No active ${algorithm} key found for purpose ${purpose}`);
  }

  return {
    keyId: activeKey.key_id,
    algorithm: activeKey.algorithm,
    purpose: activeKey.purpose,
    publicKey: JSON.parse(activeKey.public_key),
    expiresAt: activeKey.expires_at,
    rotationDate: activeKey.rotation_date,
    status: activeKey.status
  };
}

export async function verifyKeyAuthenticity(keyId) {
  const key = await getKeyById(keyId);
  if (!key) return { valid: false, reason: 'Key not found' };
  if (key.status !== 'active') return { valid: false, reason: `Key status is ${key.status}` };
  if (key.expires_at && new Date() > new Date(key.expires_at)) {
    return { valid: false, reason: 'Key has expired' };
  }
  return { valid: true, key };
}
