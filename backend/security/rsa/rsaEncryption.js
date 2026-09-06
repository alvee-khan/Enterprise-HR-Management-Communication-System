/**
 * CSE447 Security and Cryptography
 * Manual RSA Encryption
 * 
 * Mathematical formulation:
 * Ciphertext c = (m^e) mod n
 * Where:
 * - m is the plaintext numerical representative (m < n)
 * - e is the public exponent
 * - n is the modulus
 * 
 * Long message handling: Block chunking (splitting plaintext into chunks smaller than n).
 */

import { modPow } from '../math/bigMath.js';
import { importKey } from './rsaKeyGeneration.js';

export function rsaEncrypt(plaintext, publicKeyInput) {
  if (plaintext === null || plaintext === undefined) return null;
  const pubKey = importKey(publicKeyInput);
  const e = BigInt('0x' + pubKey.e);
  const n = BigInt('0x' + pubKey.n);

  const textToEncrypt = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const utf8Bytes = Buffer.from(textToEncrypt, 'utf8');

  // Maximum block byte length = (modulus bit length / 8) - 4 bytes for safety margin
  const modulusByteLength = Math.floor(n.toString(2).length / 8);
  const blockSize = Math.max(1, modulusByteLength - 4);

  const encryptedBlocks = [];

  for (let i = 0; i < utf8Bytes.length; i += blockSize) {
    const chunk = utf8Bytes.subarray(i, Math.min(i + blockSize, utf8Bytes.length));
    // Convert chunk bytes to BigInt
    const m = BigInt('0x' + (chunk.toString('hex') || '0'));
    if (m >= n) {
      throw new Error('Message block is larger than modulus n');
    }
    const c = modPow(m, e, n);
    encryptedBlocks.push(c.toString(16));
  }

  // Format ciphertext as standard base64 or prefixed bundle
  return JSON.stringify({
    version: 'RSA-CSE447',
    blocks: encryptedBlocks,
    blockSize,
    totalBytes: utf8Bytes.length
  });
}
