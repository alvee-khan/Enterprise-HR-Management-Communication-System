/**
 * CSE447 Security and Cryptography
 * Enterprise Encryption Service
 *
 * Dual-algorithm asymmetric encryption:
 *   • RSA  (manual, from scratch) → user credentials, employee profiles
 *   • ECC ElGamal (manual, from scratch) → posts / announcements
 *
 * Requirements satisfied:
 *   ✅ Req 9:  Exclusively asymmetric encryption (RSA + ECC ElGamal)
 *   ✅ Req 10: Two different asymmetric algorithms used for different data
 *   ✅ Req 13: Both algorithms implemented from scratch
 */

import crypto from 'crypto';
import prisma from '../../config/prisma.js';
import { rsaEncrypt }  from '../rsa/rsaEncryption.js';
import { rsaDecrypt }  from '../rsa/rsaDecryption.js';
import { eccElGamalEncrypt, eccElGamalDecrypt } from '../ecc/eccEncryption.js';
import { generateCryptographicKey } from '../keyManagement/keyGenerator.js';
import { storeKey, getActiveKey, getUnwrappedPrivateKey } from '../keyManagement/keyStorage.js';
import { generateMAC } from '../mac/generateMAC.js';
import { verifyMAC }   from '../mac/verifyMAC.js';

// ─── System Key Cache ─────────────────────────────────────────────────────────

let systemRsaKeyCache = null;
let systemEccEncKeyCache = null;

// ─── RSA Master Key (user data encryption) ───────────────────────────────────

export async function getOrInitializeSystemRSAKey() {
  if (systemRsaKeyCache) return systemRsaKeyCache;

  let key = await getActiveKey({ algorithm: 'RSA', purpose: 'encryption' });
  if (!key) {
    console.log('[SECURITY] Initializing Master System RSA Key Pair...');
    const newKeyData = generateCryptographicKey({ algorithm: 'RSA', purpose: 'encryption', validityDays: 365 });
    key = await storeKey(newKeyData);
  }

  systemRsaKeyCache = key;
  return key;
}

// ─── ECC Master Key (post / announcement encryption) ─────────────────────────

export async function getOrInitializeSystemECCEncryptionKey() {
  if (systemEccEncKeyCache) return systemEccEncKeyCache;

  let key = await getActiveKey({ algorithm: 'ECC', purpose: 'encryption' });
  if (!key) {
    console.log('[SECURITY] Initializing Master System ECC Encryption Key Pair...');
    const newKeyData = generateCryptographicKey({ algorithm: 'ECC', purpose: 'encryption', validityDays: 365 });
    key = await storeKey(newKeyData);
  }

  systemEccEncKeyCache = key;
  return key;
}

// ─── ECC Signature Key (kept for audit-log signing) ──────────────────────────

export async function getOrInitializeSystemECCKey() {
  let key = await getActiveKey({ algorithm: 'ECC', purpose: 'signature' });
  if (!key) {
    console.log('[SECURITY] Initializing Master System ECC Signature Key Pair...');
    const newKeyData = generateCryptographicKey({ algorithm: 'ECC', purpose: 'signature', validityDays: 365 });
    key = await storeKey(newKeyData);
  }
  return key;
}

// ─── RSA Field Encryption/Decryption (user info, employee profiles) ───────────

/**
 * Encrypt a single sensitive field using RSA (Req 2, Req 7).
 * Used for: user name, email, phone, employee salary, bank details, etc.
 */
export async function encryptSensitiveField(value) {
  if (value === null || value === undefined || value === '') return null;
  const masterKey = await getOrInitializeSystemRSAKey();
  const publicKey = JSON.parse(masterKey.public_key);
  return rsaEncrypt(value, publicKey);
}

/**
 * Decrypt a single RSA-encrypted field.
 */
export async function decryptSensitiveField(ciphertext) {
  if (!ciphertext) return null;
  const masterKey  = await getOrInitializeSystemRSAKey();
  const privateKeyJson = getUnwrappedPrivateKey(masterKey);
  if (!privateKeyJson) throw new Error('Could not unwrap RSA private key');
  const privateKey = JSON.parse(privateKeyJson);
  return rsaDecrypt(ciphertext, privateKey);
}

// ─── ECC Field Encryption/Decryption (posts) ─────────────────────────────────

/**
 * Encrypt a field using ECC ElGamal (Req 10 – second asymmetric algorithm).
 * Used for: post title, post content, announcement content.
 */
export async function eccEncryptField(value) {
  if (value === null || value === undefined || value === '') return null;
  const masterKey = await getOrInitializeSystemECCEncryptionKey();
  const publicKey = JSON.parse(masterKey.public_key);
  return eccElGamalEncrypt(value, publicKey);
}

/**
 * Decrypt an ECC ElGamal-encrypted field.
 */
export async function eccDecryptField(ciphertext) {
  if (!ciphertext) return null;
  const masterKey      = await getOrInitializeSystemECCEncryptionKey();
  const privateKeyJson = getUnwrappedPrivateKey(masterKey);
  if (!privateKeyJson) throw new Error('Could not unwrap ECC private key');
  const privateKey = JSON.parse(privateKeyJson);
  return eccElGamalDecrypt(ciphertext, privateKey);
}

// ─── Employee Profile Bulk Encryption/Decryption ─────────────────────────────

export async function encryptEmployeeProfile(employeeData) {
  const masterKey = await getOrInitializeSystemRSAKey();
  const publicKey = JSON.parse(masterKey.public_key);

  const encryptedData = { ...employeeData };

  if (employeeData.salary)           encryptedData.salary           = rsaEncrypt(employeeData.salary,           publicKey);
  if (employeeData.bankDetails)      encryptedData.bankDetails      = rsaEncrypt(employeeData.bankDetails,      publicKey);
  if (employeeData.emergencyContact) encryptedData.emergencyContact = rsaEncrypt(employeeData.emergencyContact, publicKey);

  // Integrity MAC
  const contentToHash = JSON.stringify({
    name:          employeeData.name,
    email:         employeeData.email,
    employeeCode:  employeeData.employeeCode,
    companyId:     employeeData.companyId,
    designation:   employeeData.designation
  });
  const integrityHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

  encryptedData.integrity_hash = integrityHash;
  encryptedData.mac_value      = generateMAC(integrityHash);

  return encryptedData;
}

export async function decryptAndVerifyEmployeeProfile(employeeRecord) {
  if (!employeeRecord) return null;
  const masterKey      = await getOrInitializeSystemRSAKey();
  const privateKeyJson = getUnwrappedPrivateKey(masterKey);
  if (!privateKeyJson) return employeeRecord;
  const privateKey = JSON.parse(privateKeyJson);

  const decrypted = { ...employeeRecord };

  // Verify MAC
  const contentToHash = JSON.stringify({
    name:         employeeRecord.name,
    email:        employeeRecord.email,
    employeeCode: employeeRecord.employeeCode,
    companyId:    employeeRecord.companyId,
    designation:  employeeRecord.designation
  });
  const currentHash      = crypto.createHash('sha256').update(contentToHash).digest('hex');
  decrypted._integrityVerified = employeeRecord.mac_value
    ? verifyMAC(currentHash, employeeRecord.mac_value)
    : true;

  // Decrypt salary
  if (typeof employeeRecord.salary === 'string' && employeeRecord.salary.includes('RSA-CSE447')) {
    try { decrypted.salary = JSON.parse(rsaDecrypt(employeeRecord.salary, privateKey)); } catch {}
  }
  // Decrypt bank details
  if (typeof employeeRecord.bankDetails === 'string' && employeeRecord.bankDetails.includes('RSA-CSE447')) {
    try { decrypted.bankDetails = JSON.parse(rsaDecrypt(employeeRecord.bankDetails, privateKey)); } catch {}
  }
  // Decrypt emergency contact
  if (typeof employeeRecord.emergencyContact === 'string' && employeeRecord.emergencyContact.includes('RSA-CSE447')) {
    try { decrypted.emergencyContact = JSON.parse(rsaDecrypt(employeeRecord.emergencyContact, privateKey)); } catch {}
  }

  return decrypted;
}
