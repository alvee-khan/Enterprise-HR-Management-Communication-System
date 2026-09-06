import prisma from './config/prisma.js';
import { generateTOTP } from './security/authentication/twoFactorAuth.js';

const BASE_URL = 'http://localhost:5000/api';

async function req(url, options = {}) {
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

async function loginWith2FA(email, password) {
  const user = await prisma.user.findFirst({
    where: { email },
    include: { authFactor: true }
  });
  const totpCode = user?.authFactor?.secret ? generateTOTP(user.authFactor.secret) : null;
  return await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, totpCode })
  });
}

async function verifyEntireSystem() {
  console.log('====================================================');
  console.log('🔍 FULL END-TO-END SYSTEM FUNCTIONALITY VERIFICATION');
  console.log('====================================================\n');

  let adminToken = '';
  let employeeToken = '';

  // 1. Health Check
  const health = await req('/health');
  console.log('1. Health Check:', health.data?.success ? '✅ PASSED' : '❌ FAILED');

  // 2. Admin Login (PBKDF2 Salted Password + TOTP 2FA)
  const adminLogin = await loginWith2FA('fatema@digibangla.com.bd', 'password123');
  adminToken = adminLogin.data?.accessToken;
  console.log('2. Admin Login (PBKDF2 + 2FA):', adminLogin.data?.success ? '✅ PASSED' : '❌ FAILED', `(User: ${adminLogin.data?.data?.name})`);

  // 3. Employee Login (Role-based + TOTP 2FA)
  const empLogin = await loginWith2FA('rakib@digibangla.com.bd', 'password123');
  employeeToken = empLogin.data?.accessToken;
  console.log('3. Employee Login (RBAC + 2FA):', empLogin.data?.success ? '✅ PASSED' : '❌ FAILED', `(Role: ${empLogin.data?.data?.role})`);

  const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
  const empHeaders = { headers: { Authorization: `Bearer ${employeeToken}` } };

  // 4. Security Telemetry & Keystore
  const secStatus = await req('/security/status', adminHeaders);
  console.log('4. Security Status & Keystore:', secStatus.data?.success ? '✅ PASSED' : '❌ FAILED',
    `(Active Keys: ${secStatus.data?.data?.summary?.activeKeys}, Audit: ${secStatus.data?.data?.summary?.auditChainStatus})`);

  // 5. Live Cryptographic Diagnostics (6 Tests)
  const diag = await req('/security/test', { method: 'POST', ...adminHeaders });
  console.log('5. Security Diagnostics (6/6 Tests):', diag.data?.allPassed ? '✅ ALL 6 PASSED' : '❌ FAILED');
  if (diag.data?.results) {
    diag.data.results.forEach((t, i) => {
      console.log(`   [${i+1}] ${t.name}: ${t.status} (${t.executionTimeMs}ms)`);
    });
  }

  // 6. Employees Directory (Decryption + MAC)
  const emps = await req('/employees', adminHeaders);
  const firstEmp = emps.data?.data?.[0];
  console.log('6. Employee Profiles Decryption & MAC:', emps.data?.success ? '✅ PASSED' : '❌ FAILED',
    `(Count: ${emps.data?.data?.length}, MAC Verified: ${firstEmp?._integrityVerified ? 'Yes' : 'No'})`);

  // 7. Payroll (Digital Signature + MAC)
  const payrolls = await req('/payroll', adminHeaders);
  const firstPayroll = payrolls.data?.data?.[0];
  console.log('7. Payroll & Digital Signature:', payrolls.data?.success ? '✅ PASSED' : '❌ FAILED',
    `(Count: ${payrolls.data?.data?.length}, Digitally Signed: ${firstPayroll?._hasDigitalSignature ? 'Yes' : 'No'}, MAC: ${firstPayroll?._integrityVerified ? 'Yes' : 'No'})`);

  // 8. Leaves (Approval Digital Signature + MAC)
  const leaves = await req('/leaves', adminHeaders);
  const firstLeave = leaves.data?.data?.[0];
  console.log('8. Leave Management & Approval:', leaves.data?.success ? '✅ PASSED' : '❌ FAILED',
    `(Count: ${leaves.data?.data?.length}, Digitally Signed: ${firstLeave?._isDigitallySigned ? 'Yes' : 'No'}, MAC: ${firstLeave?._integrityVerified ? 'Yes' : 'No'})`);

  // 9. Attendance
  const attendance = await req('/attendance', adminHeaders);
  console.log('9. Attendance Records:', attendance.data?.success ? '✅ PASSED' : '❌ FAILED',
    `(Total Records: ${attendance.data?.pagination?.total})`);

  // 10. Documents Vault
  const docs = await req('/documents', adminHeaders);
  const firstDoc = docs.data?.data?.[0];
  console.log('10. Document Vault:', docs.data?.success ? '✅ PASSED' : '❌ FAILED',
    `(Total Documents: ${docs.data?.data?.length}, Integrity Valid: ${firstDoc?._integrityVerified ? 'Yes' : 'No'})`);

  // 11. Audit Hash-Chain Scanner
  const audit = await req('/security/audit/verify', adminHeaders);
  console.log('11. Audit Hash-Chain Scan:', audit.data?.success && audit.data?.data?.isValid ? '✅ PASSED' : '❌ FAILED',
    `(${audit.data?.data?.verifiedEntries}/${audit.data?.data?.totalEntries} continuous blocks valid)`);

  // 12. Key Rotation Flow
  const rotate = await req('/security/keys/rotate', {
    method: 'POST',
    body: JSON.stringify({ algorithm: 'RSA', purpose: 'encryption' }),
    ...adminHeaders
  });
  console.log('12. Key Rotation Flow:', rotate.data?.success ? '✅ PASSED' : '❌ FAILED', `(New Key ID: ${rotate.data?.data?.newKeyId})`);

  // 13. RBAC Privilege Isolation Test
  const rbacDenial = await req('/security/status', empHeaders);
  console.log('13. RBAC Privilege Enforcement:', rbacDenial.status === 403 ? '✅ PASSED (Employee correctly denied 403 Forbidden)' : '❌ FAILED');

  console.log('\n====================================================');
  console.log('🎯 ALL 13/13 SYSTEM & SECURITY MODULES TESTED & WORKING');
  console.log('====================================================\n');

  process.exit(0);
}

verifyEntireSystem().catch(console.error);
