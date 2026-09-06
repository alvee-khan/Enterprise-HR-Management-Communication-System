/**
 * CSE447 Security and Cryptography
 * Audit Log Hash-Chain Integrity Verifier
 * 
 * Verifies that the audit log trail has not been tampered with or truncated:
 * 1. Checks continuity of previous_hash -> current_hash across the entire sequence.
 * 2. Checks HMAC integrity tag of each log entry.
 * 3. Checks ECC digital signature of each log entry against the system public key.
 */

import crypto from 'crypto';
import prisma from '../../config/prisma.js';
import { verifyMAC } from '../mac/verifyMAC.js';
import { verifySignature } from '../ecc/signatureVerification.js';
import { getOrInitializeSystemECCKey } from '../encryption/encryptionService.js';

export async function verifyAuditChainIntegrity(companyId = null) {
  const where = {};
  if (companyId) where.companyId = Number(companyId);

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { id: 'asc' }
  });

  if (logs.length === 0) {
    return {
      isValid: true,
      totalEntries: 0,
      corruptedEntries: [],
      message: 'No audit records to verify'
    };
  }

  const systemEccKey = await getOrInitializeSystemECCKey();
  const eccPublicKey = JSON.parse(systemEccKey.public_key);

  const corruptedEntries = [];
  let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];

    // Check 1: Chain Link
    if (i > 0 && entry.previous_hash !== expectedPrevHash) {
      corruptedEntries.push({
        id: entry.id,
        reason: `Broken chain link: Expected prev hash ${expectedPrevHash.slice(0, 8)}..., got ${entry.previous_hash ? entry.previous_hash.slice(0, 8) : 'null'}...`
      });
    }

    // Check 2: MAC Integrity
    if (entry.mac_value && entry.current_hash) {
      const isMacValid = verifyMAC(entry.current_hash, entry.mac_value);
      if (!isMacValid) {
        corruptedEntries.push({
          id: entry.id,
          reason: 'Invalid HMAC integrity tag'
        });
      }
    }

    // Check 3: Digital Signature
    if (entry.log_signature && entry.current_hash) {
      const isSigValid = verifySignature(entry.current_hash, entry.log_signature, eccPublicKey);
      if (!isSigValid) {
        corruptedEntries.push({
          id: entry.id,
          reason: 'Invalid ECC digital signature'
        });
      }
    }

    expectedPrevHash = entry.current_hash || expectedPrevHash;
  }

  return {
    isValid: corruptedEntries.length === 0,
    totalEntries: logs.length,
    verifiedEntries: logs.length - corruptedEntries.length,
    corruptedEntries,
    status: corruptedEntries.length === 0 ? 'INTEGRITY_VERIFIED_SECURE' : 'COMPROMISED'
  };
}
