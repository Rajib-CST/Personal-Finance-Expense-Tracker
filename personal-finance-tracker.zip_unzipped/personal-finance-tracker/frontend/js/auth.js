/* ==========================================================================
   auth.js — index.html login/register page logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, skip straight to the dashboard
  if (authToken()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');
  const alertBox = document.getElementById('authAlert');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      forms.forEach((f) => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}Form`).classList.add('active');
      hideAlert();
    });
  });

  document.querySelectorAll('.password-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? '🙈' : '👁';
    });
  });

  function showAlert(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `auth-alert ${type === 'success' ? 'success' : ''}`;
    alertBox.hidden = false;
  }
  function hideAlert() {
    alertBox.hidden = true;
  }

  function setLoading(button, loading, label) {
    button.disabled = loading;
    button.querySelector('span').textContent = loading ? 'Please wait…' : label;
  }

  // ---------- Login ----------
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginSubmit');

    setLoading(btn, true, 'Sign in');
    try {
      const res = await api.post('/auth/login', { email, password });
      setSession(res.data.token, { id: res.data.id, name: res.data.name, email: res.data.email });
      window.location.href = 'dashboard.html';
    } catch (err) {
      showAlert(err.message);
    } finally {
      setLoading(btn, false, 'Sign in');
    }
  });

  // ---------- Register ----------
  const registerForm = document.getElementById('registerForm');
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    const btn = document.getElementById('registerSubmit');

    if (password.length < 6) {
      showAlert('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      showAlert('Passwords do not match.');
      return;
    }

    setLoading(btn, true, 'Create account');
    try {
      const res = await api.post('/auth/register', { name, email, password });
      setSession(res.data.token, { id: res.data.id, name: res.data.name, email: res.data.email });
      window.location.href = 'dashboard.html';
    } catch (err) {
      if (err.errors && err.errors.length) {
        showAlert(err.errors.map((e) => e.message).join(' '));
      } else {
        showAlert(err.message);
      }
    } finally {
      setLoading(btn, false, 'Create account');
    }
  });
});
