const crypto = require('crypto');

// In-memory session store: token -> { userId, username, role, fullName, expiresAt }
// Simple and sufficient for a single Node.js process. For multi-instance
// deployments, replace this with a DB-backed or Redis-backed store.
const sessions = new Map();

const TTL_MS = (parseInt(process.env.SESSION_TTL_MINUTES || '120', 10)) * 60 * 1000;

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: user.USER_ID,
    username: user.USERNAME,
    role: user.ROLE,
    fullName: user.FULL_NAME,
    expiresAt: Date.now() + TTL_MS
  });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(token);
    return null;
  }
  // sliding expiry
  s.expiresAt = Date.now() + TTL_MS;
  return s;
}

function destroySession(token) {
  sessions.delete(token);
}

// Periodic cleanup of expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [token, s] of sessions.entries()) {
    if (now > s.expiresAt) sessions.delete(token);
  }
}, 5 * 60 * 1000).unref();

module.exports = { createSession, getSession, destroySession };
