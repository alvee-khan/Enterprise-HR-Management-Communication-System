/**
 * CSE447 Security and Cryptography
 * Upgraded Cryptographically Secure Audit Logger
 * 
 * Implements an immutable hash-chained audit ledger with HMAC and ECC digital signatures.
 */

import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { generateMAC } from '../security/mac/generateMAC.js';
import { signMessage } from '../security/ecc/digitalSignature.js';
import { getOrInitializeSystemECCKey } from '../security/encryption/encryptionService.js';
import { getUnwrappedPrivateKey } from '../security/keyManagement/keyStorage.js';

export const createAuditLog = async ({
  userId, companyId, action, entity, entityId,
  description, changes, req, status = 'success', metadata
}) => {
  try {
    // 1. Fetch previous audit log entry to form immutable hash chain
    const lastLog = await prisma.auditLog.findFirst({
      orderBy: { id: 'desc' }
    });

    const previous_hash = lastLog?.current_hash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();

    // 2. Compute current record hash
    const recordPayload = JSON.stringify({
      previous_hash,
      userId: userId || null,
      companyId: companyId || null,
      action,
      entity,
      entityId: entityId || null,
      description,
      changes: changes || null,
      timestamp
    });

    const current_hash = crypto.createHash('sha256').update(recordPayload).digest('hex');

    // 3. Compute HMAC integrity tag
    const mac_value = generateMAC(current_hash);

    // 4. Compute ECC digital signature
    let log_signature = null;
    try {
      const systemEccKey = await getOrInitializeSystemECCKey();
      const privKeyJson = getUnwrappedPrivateKey(systemEccKey);
      if (privKeyJson) {
        const privKey = JSON.parse(privKeyJson);
        log_signature = signMessage(current_hash, privKey);
      }
    } catch (sigErr) {
      console.error('Audit signature generation skipped:', sigErr.message);
    }

    return await prisma.auditLog.create({
      data: {
        userId: userId ? Number(userId) : null,
        companyId: companyId ? Number(companyId) : null,
        action,
        entity,
        entityId: entityId ? Number(entityId) : null,
        description,
        changes: changes || undefined,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.headers?.['user-agent'],
        status,
        metadata: metadata || undefined,
        previous_hash,
        current_hash,
        mac_value,
        log_signature
      }
    });
  } catch (error) {
    console.error('Cryptographic Audit Log Error:', error.message);
  }
};

export const auditMiddleware = (action, entity) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (data.success && req.user) {
        createAuditLog({
          userId: req.user.id,
          companyId: req.user.companyId,
          action,
          entity,
          entityId: req.params?.id || data.data?.id,
          description: `${action} ${entity}`,
          req
        }).catch(console.error);
      }
      return originalJson(data);
    };
    next();
  };
};
