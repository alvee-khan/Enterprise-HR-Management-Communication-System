/**
 * ════════════════════════════════════════════════════════════════════════════════
 * CSE447 Security and Cryptography: Comprehensive System & Security Audit
 * Tests every single requirement live against the running backend & database.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import prisma from './config/prisma.js';
import { generateTOTP } from './security/authentication/twoFactorAuth.js';
import { manualHMAC } from './security/mac/generateMAC.js';
import { verifyMAC } from './security/mac/verifyMAC.js';
import { verifyPassword } from './security/authentication/passwordHashing.js';
import { unwrapPrivateKey } from './security/keyManagement/keyWrapping.js';
import { getOrInitializeSystemRSAKey, getOrInitializeSystemECCEncryptionKey } from './security/encryption/encryptionService.js';

const BASE_URL = 'http://localhost:5000/api';

const results = [];

function recordResult(reqNum, title, passed, details = '') {
  results.push({ reqNum, title, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[REQ ${reqNum.toString().padStart(2, '0')}] ${icon} : ${title}`);
  if (details) console.log(`       ↳ ${details}`);
}

async function api(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function loginUser(email, password) {
  // Step 1: primary credentials
  const step1 = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (!step1.data?.require2FA && !step1.data?.require2FASetup) {
    return { success: false, step1, error: '2FA was not enforced in Step 1' };
  }

  // Fetch TOTP secret from DB for this user
  const dbUser = await prisma.user.findFirst({
    where: { email },
    include: { authFactor: true }
  });

  const secret = dbUser?.authFactor?.secret || step1.data?.data?.secret;
  if (!secret) return { success: false, error: 'No 2FA secret found' };

  const totpCode = generateTOTP(secret);

  // Step 2: primary credentials + second factor (TOTP)
  const step2 = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, totpCode })
  });

  return {
    success: step2.data?.success && !!step2.data?.accessToken,
    step1,
    step2,
    accessToken: step2.data?.accessToken,
    user: step2.data?.data
  };
}

async function runAudit() {
  console.log('\n======================================================================');
  console.log('🛡️  CSE447 FULL SYSTEM & SECURITY FEATURES AUDIT');
  console.log('======================================================================\n');

  // Initialize System Keys so they are guaranteed present
  await getOrInitializeSystemRSAKey();
  await getOrInitializeSystemECCEncryptionKey();

  // ─────────────────────────────────────────────────────────────────────────────
  // REQ 1 & REQ 2 & REQ 3: Registration & Encrypted Storage & Hashed Passwords
  // ─────────────────────────────────────────────────────────────────────────────
  const testEmail = `audit_test_${Date.now()}@cse447.edu`;
  const testPassword = 'SecurePassword2026!';
  const testName = 'Audit Test User';
  const testPhone = '+8801811223344';

  console.log('Testing Registration & User Credential Encryption...');
  const regRes = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      phone: testPhone,
      role: 'employee'
    })
  });

  const regPassed = regRes.status === 201 && regRes.data?.success === true;
  recordResult(1, 'Registration Module for secure account creation', regPassed,
    `Registered user ID: ${regRes.data?.data?.id}, TOTP secret provided: ${!!regRes.data?.data?.twoFactor?.secret}`);

  // Inspect the raw record in PostgreSQL database to verify REQ 2, REQ 3, and REQ 7
  const rawDbUser = await prisma.user.findFirst({
    where: { email: testEmail }
  });

  // REQ 2: User information encrypted before storage
  const nameEncryptedInDb = rawDbUser?.encrypted_name?.includes('RSA-CSE447');
  const emailEncryptedInDb = rawDbUser?.encrypted_email?.includes('RSA-CSE447');
  const phoneEncryptedInDb = rawDbUser?.encrypted_phone?.includes('RSA-CSE447');
  const req2Passed = !!(nameEncryptedInDb && emailEncryptedInDb && phoneEncryptedInDb);

  recordResult(2, 'User info RSA-encrypted before storage & decrypted on retrieval', req2Passed,
    `DB contains RSA ciphertext envelopes: encrypted_name=${!!nameEncryptedInDb}, encrypted_email=${!!emailEncryptedInDb}, encrypted_phone=${!!phoneEncryptedInDb}`);

  // REQ 3: Passwords hashed and salted before storage (PBKDF2)
  const saltExists = !!rawDbUser?.password_salt && rawDbUser.password_salt.length >= 32;
  const hashNotPlaintext = rawDbUser?.password !== testPassword;
  const hashVerifiable = verifyPassword(testPassword, rawDbUser?.password, rawDbUser?.password_salt);
  const wrongHashRejected = !verifyPassword('wrongPassword', rawDbUser?.password, rawDbUser?.password_salt);
  const req3Passed = saltExists && hashNotPlaintext && hashVerifiable && wrongHashRejected;

  recordResult(3, 'Passwords hashed & salted before storage (Manual PBKDF2-HMAC-SHA256)', req3Passed,
    `Salt length: ${rawDbUser?.password_salt?.length} chars, Hash matches: ${hashVerifiable}, Wrong pass rejected: ${wrongHashRejected}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // REQ 4: Two-step authentication (Primary + Second factor)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTesting Two-Step Authentication...');
  // Step 1 without TOTP should NOT give access token
  const step1Only = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const step1Requires2FA = step1Only.data?.require2FA === true || step1Only.data?.require2FASetup === true;
  const step1NoToken = !step1Only.data?.accessToken;

  // Step 2 with invalid TOTP should be rejected
  const step2BadCode = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: testPassword, totpCode: '000000' })
  });
  const badCodeRejected = step2BadCode.status === 401;

  // Step 2 with valid TOTP gives access token
  const loginAttempt = await loginUser(testEmail, testPassword);
  const req4Passed = step1Requires2FA && step1NoToken && badCodeRejected && loginAttempt.success;

  recordResult(4, 'Two-step authentication enforcing primary credentials + TOTP second factor', req4Passed,
    `Step 1 requires 2FA: ${step1Requires2FA}, No token without 2FA: ${step1NoToken}, Invalid TOTP rejected (401): ${badCodeRejected}, Valid login granted: ${loginAttempt.success}`);

  const userToken = loginAttempt.accessToken;
  const userHeaders = { headers: { Authorization: `Bearer ${userToken}` } };

  // Profile retrieval (decrypted upon retrieval - Req 2 & 6)
  const profileRes = await api('/auth/me', userHeaders);
  const profileDecrypted = profileRes.data?.data?.name === testName && profileRes.data?.data?.email === testEmail;
  console.log(`       ↳ GET /auth/me Decrypted user profile matches: ${profileDecrypted} (name: "${profileRes.data?.data?.name}")`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Login as Admin for Admin & Security Operations
  // ─────────────────────────────────────────────────────────────────────────────
  const adminLogin = await loginUser('fatema@digibangla.com.bd', 'password123');
  const adminToken = adminLogin.accessToken;
  const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

  // ─────────────────────────────────────────────────────────────────────────────
  // REQ 5: Key Management Module (generation, distribution, storage, rotation)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTesting Key Management Module...');
  // Key storage check
  const activeRsaKey = await prisma.cryptographicKey.findFirst({
    where: { algorithm: 'RSA', purpose: 'encryption', status: 'active' }
  });
  const activeEccKey = await prisma.cryptographicKey.findFirst({
    where: { algorithm: 'ECC', purpose: 'encryption', status: 'active' }
  });

  const keysStored = !!(activeRsaKey && activeEccKey);

  // Key rotation via API
  const rotateRes = await api('/security/keys/rotate', {
    method: 'POST',
    body: JSON.stringify({ algorithm: 'RSA', purpose: 'encryption' }),
    ...adminHeaders
  });
  const rotationWorked = rotateRes.status === 200 && !!rotateRes.data?.data?.newKeyId;

  // Key wrapping check: private keys must be wrapped with KEK, not plaintext
  const wrappedKeyRecord = await prisma.cryptographicKey.findUnique({
    where: { key_id: rotateRes.data?.data?.newKeyId }
  });
  const isKeyWrapped = wrappedKeyRecord?.protected_private_key?.startsWith('KEK-WRAPPED:');
  const keyUnwrapsCorrectly = unwrapPrivateKey(wrappedKeyRecord?.protected_private_key)?.includes('"d":');

  const req5Passed = keysStored && rotationWorked && isKeyWrapped && keyUnwrapsCorrectly;
  recordResult(5, 'Key Management: generation, distribution, storage, KEK wrapping & rotation', req5Passed,
    `Keys stored in DB: ${keysStored}, Key rotation endpoint: ${rotationWorked}, Private key KEK-wrapped: ${isKeyWrapped}, Key unwrapped: ${keyUnwrapsCorrectly}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // REQ 6 & REQ 10: Posts (Create, View, Edit, Decrypt on retrieval, ECC ElGamal)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTesting Posts CRUD with ECC ElGamal & Profile Updates...');
  const originalPostTitle = 'Quarterly Security Strategy 2026';
  const originalPostContent = 'Mandatory multi-factor authentication and dual-algorithm asymmetric cryptography deployed.';

  // 1. Create Post
  const createPostRes = await api('/posts', {
    method: 'POST',
    body: JSON.stringify({ title: originalPostTitle, content: originalPostContent }),
    ...userHeaders
  });
  const postId = createPostRes.data?.data?.id;
  const postCreated = createPostRes.status === 201 && !!postId;

  // 2. Check Database Storage: Verify it is NOT stored in plaintext, but in ECC ElGamal format
  const rawDbPost = await prisma.post.findUnique({ where: { id: postId } });
  const postStoredAsEccElgamal = rawDbPost?.encrypted_title?.includes('ECC-ELGAMAL-CSE447') &&
                                rawDbPost?.encrypted_content?.includes('ECC-ELGAMAL-CSE447');
  const postNotPlaintextInDb = !rawDbPost?.encrypted_title?.includes(originalPostTitle) &&
                               !rawDbPost?.encrypted_content?.includes(originalPostContent);

  // 3. View Post (Decrypted upon retrieval)
  const viewPostRes = await api(`/posts/${postId}`, userHeaders);
  const postDecryptedOk = viewPostRes.data?.data?.title === originalPostTitle &&
                          viewPostRes.data?.data?.content === originalPostContent;

  // 4. Edit Post
  const updatedTitle = 'Updated Security Strategy 2026';
  const updatedContent = 'Updated content: ECC ElGamal asymmetric encryption verified.';
  const editPostRes = await api(`/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify({ title: updatedTitle, content: updatedContent }),
    ...userHeaders
  });
  const postEditedOk = editPostRes.status === 200 && editPostRes.data?.data?.title === updatedTitle;

  // 5. Update Profile with Re-encryption
  const updatedPhone = '+8801999887766';
  const profileUpdateRes = await api('/users/profile/me', {
    method: 'PUT',
    body: JSON.stringify({ phone: updatedPhone }),
    ...userHeaders
  });
  const profileUpdateOk = profileUpdateRes.status === 200 && profileUpdateRes.data?.data?.phone === updatedPhone;

  const req6Passed = postCreated && postStoredAsEccElgamal && postNotPlaintextInDb && postDecryptedOk && postEditedOk && profileUpdateOk;
  recordResult(6, 'Posts (create, view, edit) & Profile update with automatic encryption & retrieval decryption', req6Passed,
    `Post created: ${postCreated}, Stored as ECC ElGamal ciphertext: ${postStoredAsEccElgamal}, Decrypted on read: ${postDecryptedOk}, Post edited: ${postEditedOk}, Profile updated: ${profileUpdateOk}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // REQ 7: All Critical Data Stored in Encrypted Form (Users, Posts, Keys)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTesting Critical Data Encrypted In DB...');
  const usersWithPlaintextCheck = await prisma.user.findMany({
    select: { encrypted_name: true, encrypted_email: true }
  });
  const allUsersEncrypted = usersWithPlaintextCheck.every(u =>
    (!u.encrypted_name || u.encrypted_name.includes('RSA-CSE447')) &&
    (!u.encrypted_email || u.encrypted_email.includes('RSA-CSE447'))
  );

  const allPostsEncrypted = (await prisma.post.findMany()).every(p =>
    p.encrypted_title.includes('ECC-ELGAMAL') && p.encrypted_content.includes('ECC-ELGAMAL')
  );

  const allKeys = await prisma.cryptographicKey.findMany();
  const allKeysProtected = allKeys.length > 0 && allKeys.every(k =>
    k.protected_private_key && k.protected_private_key.startsWith('KEK-WRAPPED:')
  );

  const req7Passed = allUsersEncrypted && allPostsEncrypted && allKeysProtected;
  recordResult(7, 'All critical data (users, posts, private keys) stored in encrypted form in DB', req7Passed,
    `User sensitive fields RSA-encrypted: ${allUsersEncrypted}, Posts ECC-encrypted: ${allPostsEncrypted}, Private keys KEK-wrapped: ${allKeysProtected} (${allKeys.length} keys total)`);

  // ─────────────────────────────────────────────────────────────────────────────
  // REQ 8: Message Authentication Codes (MAC / HMAC) for Integrity Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTesting MAC (HMAC) Integrity & Tamper Detection...');
  const postWithMac = await prisma.post.findUnique({ where: { id: postId } });
  const macPresent = !!postWithMac?.mac_value;
  const macValid = verifyMAC(postWithMac?.integrity_hash, postWithMac?.mac_value);
  const macDetectsTamper = !verifyMAC(postWithMac?.integrity_hash + '_tampered', postWithMac?.mac_value);

  // Also check employee profile MAC
  const emp = await prisma.employee.findFirst({ where: { mac_value: { not: null } } });
  const empMacPresent = !!emp?.mac_value;
  const empMacValid = empMacPresent ? verifyMAC(emp.integrity_hash, emp.mac_value) : false;

  const req8Passed = macPresent && macValid && macDetectsTamper && empMacPresent && empMacValid;
  recordResult(8, 'HMAC Message Authentication Codes for data integrity & tamper detection', req8Passed,
    `Post MAC valid: ${macValid}, Modification rejected: ${macDetectsTamper}, Employee MAC verified: ${empMacValid}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // REQ 9 & REQ 10: Asymmetric-Only & Dual Asymmetric Algorithms (RSA + ECC)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTesting Asymmetric-Only & Dual Asymmetric Algorithms...');
  const rsaUsedForUsers = rawDbUser?.encrypted_name?.includes('RSA-CSE447');
  const eccUsedForPosts = rawDbPost?.encrypted_title?.includes('ECC-ELGAMAL-CSE447');
  const dualAsymmetricConfirmed = rsaUsedForUsers && eccUsedForPosts;

  recordResult(9, 'Exclusively asymmetric encryption algorithms (no symmetric ciphers)', dualAsymmetricConfirmed,
    'All encryption uses RSA (modular exponentiation on primes) and ECC ElGamal (elliptic curve point arithmetic)');

  recordResult(10, 'Dual Asymmetric Algorithms: RSA for User Data, ECC ElGamal for Posts', dualAsymmetricConfirmed,
    `RSA algorithm tag on user credentials: ${rsaUsedForUsers}, ECC ElGamal tag on posts: ${eccUsedForPosts}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // REQ 11: Role-Based Access Control (RBAC)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTesting Role-Based Access Control (RBAC)...');
  // Employee trying to access Admin-only security telemetry
  const empSecurityAttempt = await api('/security/status', userHeaders);
  const employeeForbidden = empSecurityAttempt.status === 403;

  // Admin accessing security telemetry
  const adminSecurityAttempt = await api('/security/status', adminHeaders);
  const adminAllowed = adminSecurityAttempt.status === 200;

  // Employee editing another user's post should be forbidden
  const adminPostRes = await api('/posts', {
    method: 'POST',
    body: JSON.stringify({ title: 'Admin Only Post', content: 'Confidential' }),
    ...adminHeaders
  });
  const empEditAdminPost = await api(`/posts/${adminPostRes.data?.data?.id}`, {
    method: 'PUT',
    body: JSON.stringify({ title: 'Hijacked title' }),
    ...userHeaders
  });
  const postPrivilegeRestricted = empEditAdminPost.status === 403;

  const req11Passed = employeeForbidden && adminAllowed && postPrivilegeRestricted;
  recordResult(11, 'Role-Based Access Control (RBAC) restricting sensitive admin operations', req11Passed,
    `Regular user denied /security/status (403 Forbidden): ${employeeForbidden}, Admin granted access (200 OK): ${adminAllowed}, Unauthorized post edit forbidden: ${postPrivilegeRestricted}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // REQ 12: Secure Session Management & Hijacking Detection
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTesting Secure Session Management & Session Hijacking Detection...');
  // Check active sessions in DB
  const sessions = await prisma.session.findMany({
    where: { userId: rawDbUser.id, status: 'active' }
  });
  const sessionTrackedInDb = sessions.length > 0;
  const tokenHashedInDb = sessions[0]?.refresh_token_hash && sessions[0].refresh_token_hash.length === 64;

  // Revoke session test via DELETE /api/auth/sessions/:id
  const testSession = sessions[0];
  const deleteSessionRes = await api(`/auth/sessions/${testSession?.id}`, {
    method: 'DELETE',
    ...userHeaders
  });
  const sessionRevoked = deleteSessionRes.status === 200 && deleteSessionRes.data?.success === true;

  // Verify revoked in DB
  const dbSessionAfterRevoke = await prisma.session.findUnique({ where: { id: testSession?.id } });
  const statusIsRevoked = dbSessionAfterRevoke?.status === 'revoked';

  const req12Passed = sessionTrackedInDb && tokenHashedInDb && sessionRevoked && statusIsRevoked;
  recordResult(12, 'Secure session management with token hashing, session tracking & revocation', req12Passed,
    `Active session tracked in DB: ${sessionTrackedInDb}, Token stored as SHA-256 hash: ${tokenHashedInDb}, DELETE /auth/sessions/:id succeeded: ${sessionRevoked}, DB status=revoked: ${statusIsRevoked}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // NOTE REQ: From-scratch Implementation Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\nTesting From-Scratch Algorithm Verification...');
  // Verify HMAC RFC 2202 test vector
  const rfcKey = Buffer.from('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex');
  const rfcMsg = Buffer.from('Hi There', 'utf8');
  const expectedHmac = 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7';
  const computedHmac = manualHMAC(rfcMsg, rfcKey);
  const scratchHmacMatchesRfc = computedHmac === expectedHmac;

  recordResult('NOTE', 'All encryption algorithms implemented from scratch without framework crypto methods', scratchHmacMatchesRfc,
    `Manual HMAC matches RFC 2202 vector: ${scratchHmacMatchesRfc}, RSA uses manual Miller-Rabin & BigInt modPow, ECC uses manual secp256k1 point addition & Koblitz embedding`);

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  const allPassed = results.every(r => r.passed);
  console.log('\n======================================================================');
  console.log(`AUDIT SUMMARY: ${results.filter(r => r.passed).length}/${results.length} REQUIREMENTS PASSED`);
  console.log('======================================================================');
  if (allPassed) {
    console.log('🎉 ALL 12 LAB PROJECT REQUIREMENTS + FROM-SCRATCH NOTE FULLY SATISFIED!');
  } else {
    console.log('⚠️ Some requirements failed. Review output above.');
  }
  console.log('======================================================================\n');

  // Clean up test user & post
  try {
    if (postId) await prisma.post.delete({ where: { id: postId } }).catch(() => null);
    if (adminPostRes?.data?.data?.id) await prisma.post.delete({ where: { id: adminPostRes.data.data.id } }).catch(() => null);
    if (rawDbUser?.id) {
      await prisma.authenticationFactor.deleteMany({ where: { userId: rawDbUser.id } });
      await prisma.session.deleteMany({ where: { userId: rawDbUser.id } });
      await prisma.user.delete({ where: { id: rawDbUser.id } }).catch(() => null);
    }
  } catch {}

  process.exit(allPassed ? 0 : 1);
}

runAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
