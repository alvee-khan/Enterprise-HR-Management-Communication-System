import { generateRSAKeyPair } from './security/rsa/rsaKeyGeneration.js';
import { rsaEncrypt } from './security/rsa/rsaEncryption.js';
import { rsaDecrypt } from './security/rsa/rsaDecryption.js';
import { generateECCKeyPair } from './security/ecc/eccKeyGeneration.js';
import { signMessage } from './security/ecc/digitalSignature.js';
import { verifySignature } from './security/ecc/signatureVerification.js';
import { generateMAC } from './security/mac/generateMAC.js';
import { verifyMAC } from './security/mac/verifyMAC.js';
import { generateSalt, hashPasswordWithSalt, verifyPassword } from './security/authentication/passwordHashing.js';
import { generateBase32Secret, generateTOTP, verifyTOTP } from './security/authentication/twoFactorAuth.js';
import { verifyAuditChainIntegrity } from './security/audit/integrityVerification.js';

async function runAllTests() {
  console.log('=== RUNNING CSE447 CRYPTOGRAPHIC SUITE TESTS ===\n');

  // Test 1: RSA
  console.log('Test 1: Manual RSA Encryption & Decryption...');
  const text = 'Bangladeshi Employee Basic Salary: ৳1,60,000 BDT';
  const rsaKeys = generateRSAKeyPair(512);
  const cipher = rsaEncrypt(text, rsaKeys.publicKey);
  const decrypted = rsaDecrypt(cipher, rsaKeys.privateKey);
  console.log('  Plaintext match:', decrypted === text ? '✅ PASS' : '❌ FAIL');

  // Test 2: ECC
  console.log('\nTest 2: Manual ECC secp256k1 Digital Signatures...');
  const msg = JSON.stringify({ action: 'APPROVE_PAYROLL', emp: 'EMP-001' });
  const eccKeys = generateECCKeyPair();
  const sig = signMessage(msg, eccKeys.privateKey);
  const sigValid = verifySignature(msg, sig, eccKeys.publicKey);
  const tamperValid = verifySignature(msg + 'tampered', sig, eccKeys.publicKey);
  console.log('  Signature verification:', sigValid ? '✅ PASS' : '❌ FAIL');
  console.log('  Tamper rejection:', !tamperValid ? '✅ PASS' : '❌ FAIL');

  // Test 3: HMAC
  console.log('\nTest 3: Manual HMAC-SHA256 Integrity Verification...');
  const data = 'Employee Record: Fatema Begum (Head of People & Culture)';
  const mac = generateMAC(data);
  const macValid = verifyMAC(data, mac);
  const macTamper = verifyMAC(data + 'modified', mac);
  console.log('  HMAC verification:', macValid ? '✅ PASS' : '❌ FAIL');
  console.log('  Tamper detection:', !macTamper ? '✅ PASS' : '❌ FAIL');

  // Test 4: Password Hashing
  console.log('\nTest 4: Salted Password PBKDF2 Hashing...');
  const salt = generateSalt(16);
  const { hash } = hashPasswordWithSalt('password123', salt);
  const passValid = verifyPassword('password123', hash, salt);
  const wrongPassValid = verifyPassword('wrongpass', hash, salt);
  console.log('  Correct password verify:', passValid ? '✅ PASS' : '❌ FAIL');
  console.log('  Wrong password rejected:', !wrongPassValid ? '✅ PASS' : '❌ FAIL');

  // Test 5: TOTP 2FA
  console.log('\nTest 5: Two-Factor Authentication TOTP...');
  const secret = generateBase32Secret(20);
  const code = generateTOTP(secret);
  const totpValid = verifyTOTP(code, secret);
  console.log('  TOTP code verification:', totpValid ? '✅ PASS' : '❌ FAIL');

  // Test 6: Audit Chain
  console.log('\nTest 6: Audit Hash-Chain Integrity...');
  const auditRes = await verifyAuditChainIntegrity();
  console.log('  Audit chain valid:', auditRes.isValid ? '✅ PASS' : '❌ FAIL', `(${auditRes.verifiedEntries} verified)`);

  console.log('\n=== ALL TESTS COMPLETE ===');
  process.exit(0);
}

runAllTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
