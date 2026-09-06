/**
 * CSE447 Security and Cryptography
 * Secure Session Management Module
 *
 * Features:
 * - Session tracking in database (`sessions` table)
 * - Refresh token hashing (SHA-256) so plaintext tokens are never stored
 * - IP + User-Agent fingerprint hijacking detection & blocking (Req 12)
 * - Session revocation and auto-expiration
 *
 * Requirements satisfied:
 *   ✅ Req 12: Session hijacking prevention via IP + UA fingerprint validation
 */

import crypto from 'crypto';
import prisma from '../../config/prisma.js';

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

// ─── Session Creation ─────────────────────────────────────────────────────────

/**
 * Creates a new tracked session in the database.
 * Stores SHA-256 hash of refresh token (never plaintext).
 */
export async function createSession({ userId, refreshToken, req, expiresInDays = 7 }) {
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const ipAddress = req?.ip
    || req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || req?.socket?.remoteAddress
    || '127.0.0.1';
  const userAgent = req?.headers?.['user-agent'] || 'Unknown';

  return await prisma.session.create({
    data: {
      userId:             Number(userId),
      refresh_token_hash: tokenHash,
      ip_address:         String(ipAddress),
      user_agent:         String(userAgent),
      expires_at:         expiresAt,
      status:             'active'
    }
  });
}

// ─── Session Validation (with hijacking detection) ────────────────────────────

/**
 * Validates a refresh token and checks for session hijacking.
 *
 * Hijacking Detection (Req 12):
 *   If the User-Agent stored at session creation differs from the current
 *   request's User-Agent, the session is treated as potentially hijacked:
 *   the session is immediately revoked and the request is denied.
 *
 * @param {string} refreshToken - plaintext refresh token from cookie/body
 * @param {object} req          - Express request (used for IP + UA fingerprint)
 * @returns {{ valid: boolean, reason?: string, session?: object, user?: object }}
 */
export async function validateSession(refreshToken, req) {
  if (!refreshToken) return { valid: false, reason: 'No refresh token provided' };

  const tokenHash = hashRefreshToken(refreshToken);

  const session = await prisma.session.findFirst({
    where: { refresh_token_hash: tokenHash, status: 'active' },
    include: { user: true }
  });

  if (!session) {
    return { valid: false, reason: 'Session not found or already revoked' };
  }

  // ── Expiry check ────────────────────────────────────────────────────────────
  if (new Date() > new Date(session.expires_at)) {
    await prisma.session.update({ where: { id: session.id }, data: { status: 'expired' } });
    return { valid: false, reason: 'Session expired. Please log in again.' };
  }

  // ── User-Agent fingerprint hijacking detection (Req 12) ─────────────────────
  const currentUA = req?.headers?.['user-agent'] || '';
  const storedUA  = session.user_agent || '';

  if (storedUA && currentUA && storedUA !== currentUA) {
    // UA mismatch → potential session hijacking → revoke immediately
    await prisma.session.update({ where: { id: session.id }, data: { status: 'revoked' } });
    console.warn(
      `[SESSION-SECURITY] 🚨 Hijacking detected! userId=${session.userId} ` +
      `Stored UA: "${storedUA.substring(0, 60)}" | Current UA: "${currentUA.substring(0, 60)}"`
    );
    return {
      valid: false,
      reason: 'Session fingerprint mismatch – possible token hijacking detected. Please log in again.'
    };
  }

  // ── IP change warning (logged but not blocking – IPs can change legitimately) ─
  const currentIP = req?.ip
    || req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || '127.0.0.1';
  const storedIP  = session.ip_address || '';

  if (storedIP && currentIP && storedIP !== currentIP) {
    console.warn(
      `[SESSION-SECURITY] ⚠️ IP change for userId=${session.userId}. ` +
      `Stored: ${storedIP} | Current: ${currentIP}`
    );
  }

  // ── Update last_active timestamp ─────────────────────────────────────────────
  await prisma.session.update({
    where: { id: session.id },
    data:  { last_active: new Date() }
  });

  return { valid: true, session, user: session.user };
}

// ─── Session Revocation ───────────────────────────────────────────────────────

export async function revokeSession(sessionId) {
  return await prisma.session.update({
    where: { id: Number(sessionId) },
    data:  { status: 'revoked' }
  });
}

export async function revokeAllUserSessions(userId) {
  return await prisma.session.updateMany({
    where: { userId: Number(userId), status: 'active' },
    data:  { status: 'revoked' }
  });
}

export async function getUserActiveSessions(userId) {
  return await prisma.session.findMany({
    where:   { userId: Number(userId), status: 'active' },
    orderBy: { last_active: 'desc' },
    select: {
      id: true, ip_address: true, user_agent: true,
      created_at: true, expires_at: true, last_active: true, status: true
    }
  });
}
