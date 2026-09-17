/* ==========================================================================
   theme.js — dark/light mode toggle, persisted in localStorage
   ========================================================================== */

(function initTheme() {
  const saved = localStorage.getItem('ft_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.body.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
})();

function updateThemeToggleIcon() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const theme = document.body.getAttribute('data-theme');
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', () => {
  updateThemeToggleIcon();
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', next);
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ft_theme', next);
      updateThemeToggleIcon();
    });
  }
});
