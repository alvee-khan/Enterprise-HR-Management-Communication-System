/**
 * CSE447 Security and Cryptography
 * Security Dashboard & Security Testing Controller
 * 
 * Endpoints for:
 * - Real-time security metrics and crypto telemetry
 * - Live diagnostic suite with PASS/FAIL verification
 * - Key management operations (rotation, revocation)
 * - Audit chain integrity checks
 */

import prisma from '../config/prisma.js';
import { generateRSAKeyPair } from '../security/rsa/rsaKeyGeneration.js';
import { rsaEncrypt } from '../security/rsa/rsaEncryption.js';
import { rsaDecrypt } from '../security/rsa/rsaDecryption.js';
import { generateECCKeyPair } from '../security/ecc/eccKeyGeneration.js';
import { signMessage } from '../security/ecc/digitalSignature.js';
import { verifySignature } from '../security/ecc/signatureVerification.js';
import { generateMAC } from '../security/mac/generateMAC.js';
import { verifyMAC } from '../security/mac/verifyMAC.js';
import { generateSalt, hashPasswordWithSalt, verifyPassword } from '../security/authentication/passwordHashing.js';
import { generateBase32Secret, generateTOTP, verifyTOTP } from '../security/authentication/twoFactorAuth.js';
import { rotateKey } from '../security/keyManagement/keyRotation.js';
import { revokeKey } from '../security/keyManagement/keyRevocation.js';
import { listAllKeys } from '../security/keyManagement/keyStorage.js';
import { verifyAuditChainIntegrity } from '../security/audit/integrityVerification.js';
import { createAuditLog } from '../utils/auditLogger.js';

// @desc    Get complete security dashboard telemetry
// @route   GET /api/security/status
// @access  Private (Admin / HR / Security Officers)
export const getSecurityStatus = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const [
      keys,
      activeSessionsCount,
      activeSessions,
      lockedUsers,
      totalUsers,
      encryptedEmployeesCount,
      encryptedDocumentsCount,
      auditChainStatus
    ] = await Promise.all([
      listAllKeys({ companyId }),
      prisma.session.count({ where: { status: 'active' } }),
      prisma.session.findMany({
        where: { status: 'active' },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { last_active: 'desc' },
        take: 10
      }),
      prisma.user.findMany({
        where: { lockUntil: { gt: new Date() } },
        select: { id: true, name: true, email: true, loginAttempts: true, lockUntil: true }
      }),
      prisma.user.count(),
      prisma.employee.count({ where: { integrity_hash: { not: null } } }),
      prisma.document.count({ where: { is_encrypted: true } }),
      verifyAuditChainIntegrity()
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          rsaEncryptionStatus: 'ACTIVE (Manual Pure Asymmetric)',
          eccSignatureStatus: 'ACTIVE (ECDSA secp256k1)',
          macIntegrityStatus: 'ACTIVE (Manual HMAC-SHA256)',
          auditChainStatus: auditChainStatus.status,
          totalKeys: keys.length,
          activeKeys: keys.filter(k => k.status === 'active').length,
          activeSessionsCount,
          lockedUsersCount: lockedUsers.length,
          totalUsers,
          encryptedEmployeesCount,
          encryptedDocumentsCount
        },
        keys,
        activeSessions,
        lockedUsers,
        auditChain: auditChainStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run automated security test panel
// @route   POST /api/security/test
// @access  Private (Admin / HR)
export const runSecurityTests = async (req, res, next) => {
  try {
    const results = [];

    // TEST 1: Manual RSA Encryption & Decryption
    try {
      const t0 = performance.now();
      const testPayload = 'Confidential CSE447 HR Data: Basic Salary ৳85,000 + NID 19922692800000000';
      const keypair = generateRSAKeyPair(512);
      const ciphertext = rsaEncrypt(testPayload, keypair.publicKey);
      const decrypted = rsaDecrypt(ciphertext, keypair.privateKey);
      const t1 = performance.now();

      const passed = decrypted === testPayload;
      results.push({
        name: 'Manual RSA Asymmetric Encryption & Decryption',
        algorithm: 'RSA (512-bit Miller-Rabin Primes, Square-and-Multiply, Extended Euclidean Inverse)',
        purpose: 'Confidential Employee Profile and User Information Protection',
        status: passed ? 'PASS' : 'FAIL',
        executionTimeMs: Number((t1 - t0).toFixed(2)),
        details: {
          originalLength: testPayload.length,
          ciphertextPreview: typeof ciphertext === 'string' ? ciphertext.slice(0, 80) + '...' : JSON.stringify(ciphertext).slice(0, 80) + '...',
          decryptedMatch: passed
        }
      });
    } catch (err) {
      results.push({
        name: 'Manual RSA Asymmetric Encryption & Decryption',
        status: 'FAIL',
        error: err.message
      });
    }

    // TEST 2: Manual ECC Digital Signature & Verification
    try {
      const t0 = performance.now();
      const testMessage = JSON.stringify({ action: 'APPROVE_PAYROLL', amount: 85000, month: 'August', year: 2026 });
      const eccKeypair = generateECCKeyPair();
      const signature = signMessage(testMessage, eccKeypair.privateKey);
      const isValid = verifySignature(testMessage, signature, eccKeypair.publicKey);

      // Negative test: verify tampered message is rejected
      const tamperedMessage = JSON.stringify({ action: 'APPROVE_PAYROLL', amount: 999999, month: 'August', year: 2026 });
      const tamperedRejected = !verifySignature(tamperedMessage, signature, eccKeypair.publicKey);

      const t1 = performance.now();

      const passed = isValid && tamperedRejected;
      results.push({
        name: 'Manual ECC ECDSA Digital Signature & Verification',
        algorithm: 'ECC (secp256k1 Weierstrass Curve: y^2 = x^3 + 7 mod p, Double-and-Add Scalar Multiplication)',
        purpose: 'Payroll, Leave Approval & QR Attendance Authentication',
        status: passed ? 'PASS' : 'FAIL',
        executionTimeMs: Number((t1 - t0).toFixed(2)),
        details: {
          signatureValid: isValid,
          tamperDetectionPassed: tamperedRejected,
          signaturePreview: typeof signature === 'string' ? signature.slice(0, 70) + '...' : JSON.stringify(signature).slice(0, 70) + '...'
        }
      });
    } catch (err) {
      results.push({
        name: 'Manual ECC ECDSA Digital Signature & Verification',
        status: 'FAIL',
        error: err.message
      });
    }

    // TEST 3: Manual HMAC-SHA256 Message Authentication Code
    try {
      const t0 = performance.now();
      const data = 'Audit Entry: User Admin updated designation for Employee EMP-0001';
      const secret = 'Enterprise_Secret_Key_For_Testing';
      const mac = generateMAC(data, secret);
      const isMacValid = verifyMAC(data, mac, secret);

      // Tamper test
      const tamperedData = 'Audit Entry: User Attacker elevated permissions for Employee EMP-0001';
      const isTamperDetected = !verifyMAC(tamperedData, mac, secret);

      const t1 = performance.now();
      const passed = isMacValid && isTamperDetected;

      results.push({
        name: 'Manual HMAC-SHA256 Integrity Verification',
        algorithm: 'HMAC (Inner Pad 0x36 / Outer Pad 0x5C with Constant-Time Comparison)',
        purpose: 'Record Integrity Verification & Modification Detection',
        status: passed ? 'PASS' : 'FAIL',
        executionTimeMs: Number((t1 - t0).toFixed(2)),
        details: {
          macValue: mac,
          integrityConfirmed: isMacValid,
          tamperPrevented: isTamperDetected
        }
      });
    } catch (err) {
      results.push({
        name: 'Manual HMAC-SHA256 Integrity Verification',
        status: 'FAIL',
        error: err.message
      });
    }

    // TEST 4: Password Salting and PBKDF2 Hashing
    try {
      const t0 = performance.now();
      const password = 'SuperSecretHRPassword@2026';
      const salt = generateSalt(16);
      const { hash } = hashPasswordWithSalt(password, salt);
      const match = verifyPassword(password, hash, salt);
      const wrongMatch = !verifyPassword('WrongPassword', hash, salt);

      const t1 = performance.now();
      const passed = match && wrongMatch;

      results.push({
        name: 'Salted Password Hashing & Pre-Image Resistance',
        algorithm: 'PBKDF2-HMAC-SHA256 (10,000 Iterations with 128-bit Cryptographic Salt)',
        purpose: 'One-Way Authentication Credential Storage (Cannot be decrypted)',
        status: passed ? 'PASS' : 'FAIL',
        executionTimeMs: Number((t1 - t0).toFixed(2)),
        details: {
          saltLength: salt.length,
          hashLength: hash.length,
          correctPasswordVerified: match,
          wrongPasswordRejected: wrongMatch
        }
      });
    } catch (err) {
      results.push({
        name: 'Salted Password Hashing & Pre-Image Resistance',
        status: 'FAIL',
        error: err.message
      });
    }

    // TEST 5: Two-Factor Authentication (TOTP RFC 6238)
    try {
      const t0 = performance.now();
      const secret = generateBase32Secret(20);
      const currentToken = generateTOTP(secret);
      const isValid = verifyTOTP(currentToken, secret);
      const isInvalidRejected = !verifyTOTP('999999', secret);

      const t1 = performance.now();
      const passed = isValid && isInvalidRejected;

      results.push({
        name: 'Two-Factor Authentication (TOTP / RFC 6238)',
        algorithm: 'Time-Based One-Time Password with Manual HMAC Dynamic Truncation',
        purpose: 'Two-Step Multi-Factor Authentication',
        status: passed ? 'PASS' : 'FAIL',
        executionTimeMs: Number((t1 - t0).toFixed(2)),
        details: {
          secretGenerated: secret,
          otpToken: currentToken,
          validTokenAccepted: isValid,
          invalidTokenRejected: isInvalidRejected
        }
      });
    } catch (err) {
      results.push({
        name: 'Two-Factor Authentication (TOTP / RFC 6238)',
        status: 'FAIL',
        error: err.message
      });
    }

    // TEST 6: Audit Log Hash-Chain Continuous Ledger Scan
    try {
      const t0 = performance.now();
      const chainScan = await verifyAuditChainIntegrity();
      const t1 = performance.now();

      results.push({
        name: 'Cryptographic Audit Log Hash-Chain Ledger Scan',
        algorithm: 'SHA-256 Chained Hash Ledger + HMAC Integrity + ECC Digital Signature',
        purpose: 'Continuous Tamper-Evident Audit Trail',
        status: chainScan.isValid ? 'PASS' : 'FAIL',
        executionTimeMs: Number((t1 - t0).toFixed(2)),
        details: {
          totalEntriesVerified: chainScan.totalEntries,
          corruptedCount: chainScan.corruptedEntries.length,
          ledgerStatus: chainScan.status
        }
      });
    } catch (err) {
      results.push({
        name: 'Cryptographic Audit Log Hash-Chain Ledger Scan',
        status: 'FAIL',
        error: err.message
      });
    }

    const allPassed = results.every(r => r.status === 'PASS');

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      allPassed,
      results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger key rotation
// @route   POST /api/security/keys/rotate
// @access  Private (Admin only)
export const handleKeyRotation = async (req, res, next) => {
  try {
    const { algorithm = 'RSA', purpose = 'encryption' } = req.body;
    const result = await rotateKey({ algorithm, purpose, companyId: req.user.companyId });

    await createAuditLog({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'KEY_ROTATION',
      entity: 'CryptographicKey',
      entityId: null,
      description: `Rotated ${algorithm} key for purpose ${purpose}`,
      req
    });

    res.status(200).json({ success: true, message: `${algorithm} Key rotated successfully`, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke a key
// @route   POST /api/security/keys/:id/revoke
// @access  Private (Admin only)
export const handleKeyRevocation = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const key = await revokeKey(req.params.id, reason);

    await createAuditLog({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'UPDATE',
      entity: 'CryptographicKey',
      entityId: key.id,
      description: `Revoked key ${req.params.id}. Reason: ${reason || 'Manual administrative revocation'}`,
      req
    });

    res.status(200).json({ success: true, message: 'Key revoked successfully', data: key });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Audit Chain
// @route   GET /api/security/audit/verify
// @access  Private (Admin / HR)
export const verifyAuditLogLedger = async (req, res, next) => {
  try {
    const scan = await verifyAuditChainIntegrity();
    res.status(200).json({ success: true, data: scan });
  } catch (error) {
    next(error);
  }
};
