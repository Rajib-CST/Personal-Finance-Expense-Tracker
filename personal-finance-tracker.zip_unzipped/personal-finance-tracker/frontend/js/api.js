/* ==========================================================================
   api.js — thin fetch wrapper + auth/session helpers, shared by every page
   ========================================================================== */

const API_BASE = '/api';

const CATEGORIES = {
  expense: ['Food', 'Travel', 'Shopping', 'Education', 'Bills', 'Others'],
  income: ['Salary', 'Freelance', 'Business', 'Investment', 'Other'],
};

const CATEGORY_ICONS = {
  Food: '🍔', Travel: '✈️', Shopping: '🛍️', Education: '📚', Bills: '🧾', Others: '📦',
  Salary: '💼', Freelance: '💻', Business: '🏪', Investment: '📈', Other: '➕',
};

function authToken() {
  return localStorage.getItem('ft_token');
}
function setSession(token, user) {
  localStorage.setItem('ft_token', token);
  localStorage.setItem('ft_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('ft_token');
  localStorage.removeItem('ft_user');
}
function currentUser() {
  const raw = localStorage.getItem('ft_user');
  return raw ? JSON.parse(raw) : null;
}

async function apiRequest(endpoint, options = {}) {
  const token = authToken();
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch (networkErr) {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/csv')) {
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  }

  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    /* empty body */
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      if (!location.pathname.endsWith('index.html') && location.pathname !== '/') {
        location.href = 'index.html';
      }
    }
    const err = new Error(data.message || `Request failed (${response.status})`);
    err.errors = data.errors;
    throw err;
  }

  return data;
}

const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) { alert(message); return; }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}
