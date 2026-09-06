import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

/**
 * CSE447 – protect middleware
 *
 * Changes for Req 12 (Secure Session Management):
 *   After JWT verification, we confirm the user still has at least one
 *   active session in the database.  If ALL sessions have been revoked
 *   (e.g. after logout, password change, or hijacking detection) the
 *   access token is also rejected, even if it is still cryptographically
 *   valid.  This closes the window between token theft and expiry.
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized – no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── Active-session revocation check (Req 12) ─────────────────────────────
    // If every session for this user is revoked/expired, reject the token.
    const activeSessionCount = await prisma.session.count({
      where: { userId: decoded.id, status: 'active' }
    });

    if (activeSessionCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'All sessions revoked. Please log in again.'
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true, name: true, email: true, role: true,
        companyId: true, employeeProfileId: true,
        profileImage: true, preferences: true, isActive: true,
        phone: true, loginAttempts: true, lockUntil: true,
        encrypted_name: true, encrypted_email: true, encrypted_phone: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Access token expired' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized – invalid token' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, name: true, email: true, role: true, companyId: true, isActive: true }
      });
    }
    next();
  } catch {
    next();
  }
};
