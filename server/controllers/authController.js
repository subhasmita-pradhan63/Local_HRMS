const bcrypt = require('bcryptjs');
const db = require('../db');
const { sendJson, sendError, readJsonBody, setCookie, clearCookie, parseCookies } = require('../utils/http');
const { createSession, getSession, destroySession } = require('../utils/sessionStore');

const COOKIE_NAME = 'payroll_sid';

async function login(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    return sendError(res, 400, e.message);
  }
  const { username, password } = body;
  if (!username || !password) {
    return sendError(res, 400, 'Username and password are required.');
  }

  try {
    const result = await db.execute(
      `SELECT user_id, username, password_hash, full_name, role, is_active
       FROM app_users WHERE LOWER(username) = LOWER(:username)`,
      { username }
    );
    const user = result.rows[0];
    if (!user || user.IS_ACTIVE !== 1) {
      return sendError(res, 401, 'Invalid username or password.');
    }
    const ok = bcrypt.compareSync(password, user.PASSWORD_HASH);
    if (!ok) {
      return sendError(res, 401, 'Invalid username or password.');
    }
    const token = createSession(user);
    setCookie(res, COOKIE_NAME, token, { maxAge: parseInt(process.env.SESSION_TTL_MINUTES || '120', 10) * 60 });
    sendJson(res, 200, {
      success: true,
      user: { username: user.USERNAME, fullName: user.FULL_NAME, role: user.ROLE }
    });
  } catch (err) {
    console.error('[auth] login error', err);
    sendError(res, 500, 'Server error during login. Check database connection.');
  }
}

function logout(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (token) destroySession(token);
  clearCookie(res, COOKIE_NAME);
  sendJson(res, 200, { success: true });
}

function me(req, res) {
  if (!req.session) return sendError(res, 401, 'Not authenticated.');
  sendJson(res, 200, {
    success: true,
    user: { username: req.session.username, fullName: req.session.fullName, role: req.session.role }
  });
}

/**
 * Middleware-style guard: attaches req.session if a valid session cookie is present.
 * Returns true if authenticated, false (and writes 401) otherwise.
 */
function requireAuth(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  const session = getSession(token);
  if (!session) {
    sendError(res, 401, 'Not authenticated. Please log in.');
    return false;
  }
  req.session = session;
  return true;
}

module.exports = { login, logout, me, requireAuth, COOKIE_NAME };
