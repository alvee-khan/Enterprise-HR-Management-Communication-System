/**
 * CSE447 Security and Cryptography
 * Manual RSA Decryption
 * 
 * Mathematical formulation:
 * Plaintext m = (c^d) mod n
 * Where:
 * - c is the ciphertext numerical block
 * - d is the private exponent
 * - n is the modulus
 */

import { modPow } from '../math/bigMath.js';
import { importKey } from './rsaKeyGeneration.js';

export function rsaDecrypt(ciphertextInput, privateKeyInput) {
  if (!ciphertextInput) return null;
  const privKey = importKey(privateKeyInput);
  const d = BigInt('0x' + privKey.d);
  const n = BigInt('0x' + privKey.n);

  let payload;
  try {
    payload = typeof ciphertextInput === 'string' ? JSON.parse(ciphertextInput) : ciphertextInput;
  } catch {
    throw new Error('Invalid RSA ciphertext format');
  }

  if (!payload || !Array.isArray(payload.blocks)) {
    throw new Error('Corrupted RSA ciphertext envelope');
  }

  const decryptedByteChunks = [];

  for (let i = 0; i < payload.blocks.length; i++) {
    const cHex = payload.blocks[i];
    const c = BigInt('0x' + cHex);
    const m = modPow(c, d, n);

    let hexStr = m.toString(16);
    if (hexStr.length % 2 !== 0) {
      hexStr = '0' + hexStr;
    }

    // Convert to buffer
    decryptedByteChunks.push(Buffer.from(hexStr, 'hex'));
  }

  const combined = Buffer.concat(decryptedByteChunks);
  const resultText = combined.toString('utf8');

  return resultText;
}
