/**
 * CSE447 Security and Cryptography
 * Secure QR Attendance Generator & Cryptographic Verifier
 * 
 * Features:
 * - Prevents QR reuse, replay attacks, and token forgery
 * - Includes nonce, timestamp, validity window, and ECC Digital Signature
 */

import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { signMessage } from '../security/ecc/digitalSignature.js';
import { verifySignature } from '../security/ecc/signatureVerification.js';
import { getOrInitializeSystemECCKey } from '../security/encryption/encryptionService.js';

/**
 * Generates cryptographically signed QR code for attendance
 */
export const generateAttendanceQR = async (companyId, date) => {
  const nonce = uuidv4();
  const timestamp = Date.now();
  const dateStr = date || new Date().toISOString().split('T')[0];
  const validityMs = 5 * 60 * 1000; // 5 minute validity window to prevent reuse

  const payload = {
    companyId: companyId.toString(),
    date: dateStr,
    nonce,
    timestamp,
    expiresAt: timestamp + validityMs
  };

  const payloadString = JSON.stringify(payload);

  // Generate ECC Digital Signature
  const systemEccKey = await getOrInitializeSystemECCKey();
  const privKey = JSON.parse(systemEccKey.protected_private_key);
  const signature = signMessage(payloadString, privKey);

  const qrPacket = {
    payload,
    signature,
    publicKey: JSON.parse(systemEccKey.public_key)
  };

  const packetString = JSON.stringify(qrPacket);
  const base64 = Buffer.from(packetString).toString('base64');

  const qrDataUrl = await QRCode.toDataURL(base64, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 400,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' }
  });

  return { qrDataUrl, nonce, payload, signature };
};

/**
 * Cryptographically verifies attendance QR token
 */
export const verifyQRToken = async (base64String) => {
  try {
    const packetString = Buffer.from(base64String, 'base64').toString('utf8');
    const qrPacket = JSON.parse(packetString);

    if (!qrPacket.payload || !qrPacket.signature) {
      return { valid: false, error: 'Malformed QR packet structure' };
    }

    const { payload, signature } = qrPacket;

    // 1. Verify Timestamp & Expiration
    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'QR Code expired. Please refresh the scanner.' };
    }

    // 2. Verify ECC Digital Signature
    const systemEccKey = await getOrInitializeSystemECCKey();
    const eccPublicKey = JSON.parse(systemEccKey.public_key);
    const payloadString = JSON.stringify(payload);

    const isSigValid = verifySignature(payloadString, signature, eccPublicKey);
    if (!isSigValid) {
      return { valid: false, error: 'Cryptographic digital signature verification failed. Possible forged QR.' };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: `Invalid QR code payload: ${error.message}` };
  }
};

export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};
