document.getElementById('year').textContent = new Date().getFullYear();

// If already logged in, skip straight to dashboard.
(async () => {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (res.ok) window.location.href = '/dashboard.html';
  } catch (e) { /* not logged in, stay on page */ }
})();

const form = document.getElementById('loginForm');
const alertBox = document.getElementById('alertBox');
const loginBtn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert(alertBox);
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    await apiFetch('/api/login', { method: 'POST', body: { username, password } });
    window.location.href = '/dashboard.html';
  } catch (err) {
    showAlert(alertBox, err.message || 'Login failed.');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});
