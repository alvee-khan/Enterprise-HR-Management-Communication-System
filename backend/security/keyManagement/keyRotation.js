/**
 * CSE447 Security and Cryptography
 * Key Management: Key Rotation
 * 
 * Automates key retirement and new key generation for crypto-agility and compliance.
 */

import prisma from '../../config/prisma.js';
import { generateCryptographicKey } from './keyGenerator.js';
import { storeKey, getActiveKey } from './keyStorage.js';

export async function rotateKey({ algorithm = 'RSA', purpose = 'encryption', userId = null, companyId = null }) {
  // Step 1: Mark current active key as 'rotated'
  const currentKey = await getActiveKey({ algorithm, purpose, userId, companyId });
  if (currentKey) {
    await prisma.cryptographicKey.update({
      where: { id: currentKey.id },
      data: { status: 'rotated' }
    });
  }

  // Step 2: Generate and store new active key
  const newKeyData = generateCryptographicKey({ algorithm, purpose, userId, companyId });
  const savedNewKey = await storeKey(newKeyData);

  return {
    previousKeyId: currentKey ? currentKey.key_id : null,
    newKeyId: savedNewKey.key_id,
    algorithm,
    purpose,
    status: 'active',
    rotatedAt: new Date()
  };
}
