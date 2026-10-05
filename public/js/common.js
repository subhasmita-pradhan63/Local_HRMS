// Shared helpers used across all pages.

async function apiFetch(path, options = {}) {
  const opts = Object.assign({ credentials: 'same-origin' }, options);
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, opts);
  let data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON (e.g. PDF) handled by caller */ }

  if (res.status === 401 && !path.includes('/api/login')) {
    window.location.href = '/index.html';
    throw new Error('Not authenticated');
  }
  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

async function requireLogin() {
  try {
    const data = await apiFetch('/api/me');
    renderUserBox(data.user);
    return data.user;
  } catch (e) {
    window.location.href = '/index.html';
    return null;
  }
}

function renderUserBox(user) {
  const nameEl = document.querySelector('[data-user-name]');
  const roleEl = document.querySelector('[data-user-role]');
  if (nameEl) nameEl.textContent = user.fullName || user.username;
  if (roleEl) roleEl.textContent = user.role;
}

async function doLogout() {
  try { await apiFetch('/api/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
  window.location.href = '/index.html';
}

function setupSidebarToggle() {
  const btn = document.querySelector('[data-hamburger]');
  const sidebar = document.querySelector('.sidebar');
  if (!btn || !sidebar) return;
  btn.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 900) return;
    if (!sidebar.contains(e.target) && !btn.contains(e.target)) sidebar.classList.remove('open');
  });
}

function fmtMoney(n) {
  const num = Number(n) || 0;
  return 'Rs. ' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function showAlert(container, message, type = 'error') {
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

function clearAlert(container) {
  if (container) container.innerHTML = '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.querySelector('[data-logout]');
  if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
  setupSidebarToggle();
});
