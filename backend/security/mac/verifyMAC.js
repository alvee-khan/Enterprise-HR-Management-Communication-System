/**
 * CSE447 Security and Cryptography
 * Manual MAC Verification with Constant-Time Comparison
 * 
 * Prevents timing attacks by comparing all bytes in constant time.
 */

import { generateMAC } from './generateMAC.js';

export function constantTimeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function verifyMAC(data, providedMAC, key) {
  if (!data || !providedMAC) return false;
  const computedMAC = generateMAC(data, key);
  return constantTimeEquals(computedMAC, providedMAC);
}
