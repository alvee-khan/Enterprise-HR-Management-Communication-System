/**
 * CSE447 Security and Cryptography
 * Session Tracking Middleware
 */

import { validateSession } from './sessionSecurity.js';

export const trackSessionMiddleware = async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (refreshToken) {
    try {
      const result = await validateSession(refreshToken, req);
      if (result.valid) {
        req.sessionId = result.session.id;
      }
    } catch {
      // Non-blocking for general requests
    }
  }
  next();
};
