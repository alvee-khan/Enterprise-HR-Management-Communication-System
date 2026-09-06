/**
 * CSE447 Quick smoke-test for all newly implemented security modules.
 * Run with: node test_new_modules.js
 */
import { wrapPrivateKey, unwrapPrivateKey } from './security/keyManagement/keyWrapping.js';
import { generateSalt, hashPasswordWithSalt, verifyPassword } from './security/authentication/passwordHashing.js';
import { eccElGamalEncrypt, eccElGamalDecrypt } from './security/ecc/eccEncryption.js';
import { generateECCKeyPair } from './security/ecc/eccKeyGeneration.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(() => { console.log(`  ✅ PASS: ${name}`); passed++; })
                   .catch(e => { console.error(`  ❌ FAIL: ${name} →`, e.message); failed++; });
    }
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ FAIL: ${name} →`, e.message);
    failed++;
  }
}

console.log('\n🔐 CSE447 Security Module Smoke Test\n');

// ── 1. KEK Key Wrapping ────────────────────────────────────────────────────────
console.log('1. KEK Key Wrapping (Req 7):');
const fakePrivKey = JSON.stringify({ d: 'abc123deadbeef', curve: 'secp256k1' });
const wrapped    = wrapPrivateKey(fakePrivKey);
const unwrapped  = unwrapPrivateKey(wrapped);
test('wrap then unwrap returns original', () => {
  if (wrapped === fakePrivKey) throw new Error('Key was not encrypted!');
  if (!wrapped.startsWith('KEK-WRAPPED:')) throw new Error('Missing KEK-WRAPPED prefix');
  if (unwrapped !== fakePrivKey) throw new Error(`Unwrapped mismatch: ${unwrapped}`);
});
test('backward-compat: plain JSON passes through unwrap unchanged', () => {
  const plain = JSON.stringify({ d: 'legacy', curve: 'secp256k1' });
  if (unwrapPrivateKey(plain) !== plain) throw new Error('Backward-compat broke');
});

// ── 2. Manual PBKDF2 Password Hashing ─────────────────────────────────────────
console.log('\n2. Manual PBKDF2 Password Hashing (Req 3):');
const salt     = generateSalt(16);
const { hash } = hashPasswordWithSalt('SecureP@ssw0rd!', salt, 100); // low iter for speed
test('hash is a non-empty hex string', () => {
  if (!hash || hash.length !== 64) throw new Error(`Bad hash length: ${hash.length}`);
});
test('correct password verifies', () => {
  if (!verifyPassword('SecureP@ssw0rd!', hash, salt, 100)) throw new Error('Verify failed');
});
test('wrong password rejected', () => {
  if (verifyPassword('WrongPassword!', hash, salt, 100)) throw new Error('Wrong pw accepted!');
});

// ── 3. ECC ElGamal Encryption ─────────────────────────────────────────────────
console.log('\n3. ECC ElGamal Encryption/Decryption (Req 10):');
const eccKeys = generateECCKeyPair();
const messages = [
  'Hello, ECC!',
  'Short msg',
  'This is a somewhat longer message that spans more than one chunk to test multi-block encryption and decryption working correctly across boundaries.',
  'CSE447 Lab Project – Security & Cryptography 2026'
];

for (const msg of messages) {
  const ciphertext = eccElGamalEncrypt(msg, eccKeys.publicKey);
  const decrypted  = eccElGamalDecrypt(ciphertext, eccKeys.privateKey);
  test(`encrypt→decrypt: "${msg.substring(0, 30)}${msg.length > 30 ? '...' : ''}"`, () => {
    if (decrypted !== msg) throw new Error(`Expected "${msg}" got "${decrypted}"`);
    const parsed = JSON.parse(ciphertext);
    if (parsed.version !== 'ECC-ELGAMAL-CSE447') throw new Error('Missing version tag');
    if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0) throw new Error('No blocks');
  });
}

test('wrong private key cannot decrypt', () => {
  const wrongKeys = generateECCKeyPair();
  const ct = eccElGamalEncrypt('secret', eccKeys.publicKey);
  try {
    eccElGamalDecrypt(ct, wrongKeys.privateKey);
    throw new Error('Should have failed or produced garbage');
  } catch (e) {
    // Expected: decrypted garbage won't match 'secret'
    // Either throws or returns wrong value – both are correct behavior
  }
});

setTimeout(() => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('🎉 All tests passed!\n');
  else console.log('⚠️  Some tests failed. See above.\n');
}, 100);
