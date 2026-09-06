/**
 * CSE447 Security and Cryptography
 * Key Management: Key Revocation
 * 
 * Handles emergency key revocation in case of compromised keys or offboarding.
 */

import prisma from '../../config/prisma.js';

export async function revokeKey(keyId, reason = 'Administrative revocation') {
  const key = await prisma.cryptographicKey.findUnique({
    where: { key_id: keyId }
  });

  if (!key) {
    throw new Error('Key not found');
  }

  const updatedKey = await prisma.cryptographicKey.update({
    where: { id: key.id },
    data: {
      status: 'revoked',
      metadata: {
        ...(typeof key.metadata === 'object' && key.metadata !== null ? key.metadata : {}),
        revocationReason: reason,
        revokedAt: new Date().toISOString()
      }
    }
  });

  return updatedKey;
}
