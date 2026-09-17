/* ==========================================================================
   dashboard.js — app shell: auth guard, navigation, modals, dashboard view
   ========================================================================== */

const dashState = { month: new Date().getMonth() + 1, year: new Date().getFullYear(), mode: 'monthly' };

// ---------- Auth guard ----------
(function guard() {
  if (!authToken()) {
    window.location.href = 'index.html';
  }
})();

// ---------- Shared: month/year select population ----------
function populateMonthYearSelects(monthSelect, yearSelect, selectedMonth, selectedYear) {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  monthSelect.innerHTML = monthNames.map((name, idx) => `<option value="${idx + 1}">${name}</option>`).join('');
  monthSelect.value = selectedMonth;

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 3; y <= currentYear + 1; y++) years.push(y);
  yearSelect.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join('');
  yearSelect.value = selectedYear;
}

// ---------- Shared: modal helpers ----------
function openModal(id) {
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById(id).classList.add('active');
}
function closeModal(id) {
  document.getElementById('modalOverlay').classList.remove('active');
  document.getElementById(id).classList.remove('active');
}
function closeAllModals() {
  document.querySelectorAll('.modal').forEach((m) => m.classList.remove('active'));
  document.getElementById('modalOverlay').classList.remove('active');
}

let confirmCallback = null;
function openConfirm(title, text, onConfirm) {
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalText').textContent = text;
  confirmCallback = onConfirm;
  openModal('confirmModal');
}

// ---------- Dashboard view rendering ----------
async function refreshDashboard() {
  try {
    const recentPromise = api.get('/transactions?limit=5&page=1');

    if (dashState.mode === 'monthly') {
      const [dashRes, summaryRes, recentRes] = await Promise.all([
        api.get(`/dashboard?month=${dashState.month}&year=${dashState.year}`),
        api.get(`/transactions/summary?year=${dashState.year}`),
        recentPromise,
      ]);
      const d = dashRes.data;
      updateStatCards(d.totalIncome, d.totalExpense, d.remainingBudget, 'this month');
      renderCategoryChart(d.categoryBreakdown);
      renderTrendChart(summaryRes.data.monthlyTrend, dashState.year);
      renderRecentList(recentRes.data);
    } else {
      const [summaryRes, recentRes, yearlyBudget] = await Promise.all([
        api.get(`/transactions/summary?year=${dashState.year}`),
        recentPromise,
        fetchYearlyBudgetTotal(dashState.year),
      ]);
      const totals = summaryRes.data.totals || [];
      const totalIncome = Number((totals.find((t) => t.type === 'income') || {}).total || 0);
      const totalExpense = Number((totals.find((t) => t.type === 'expense') || {}).total || 0);
      const remainingBudget = yearlyBudget - totalExpense;
      const expenseByCategory = (summaryRes.data.byCategory || []).filter((c) => c.type === 'expense');

      updateStatCards(totalIncome, totalExpense, remainingBudget, 'this year');
      renderCategoryChart(expenseByCategory);
      renderTrendChart(summaryRes.data.monthlyTrend, dashState.year);
      renderRecentList(recentRes.data);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function fetchYearlyBudgetTotal(year) {
  const requests = [];
  for (let m = 1; m <= 12; m++) requests.push(api.get(`/budgets?month=${m}&year=${year}`));
  const results = await Promise.all(requests);
  let total = 0;
  results.forEach((r) => r.data.forEach((b) => { total += Number(b.monthly_limit); }));
  return total;
}

function updateStatCards(income, expense, remainingBudget, periodLabel) {
  const savings = income - expense;
  document.getElementById('statSavings').textContent = formatCurrency(savings);
  document.getElementById('statSavingsSub').textContent = `Income minus expenses ${periodLabel}`;
  document.getElementById('statIncome').textContent = formatCurrency(income);
  document.getElementById('statExpense').textContent = formatCurrency(expense);
  document.getElementById('statBudget').textContent = formatCurrency(remainingBudget);
}

function renderRecentList(transactions) {
  const container = document.getElementById('recentList');
  if (!transactions.length) {
    container.innerHTML = '<p class="empty-note">No transactions yet. Add your first one from the Transactions tab.</p>';
    return;
  }
  container.innerHTML = transactions.map((tx) => `
    <div class="recent-row">
      <span class="recent-ic" style="background:${tx.type === 'income' ? 'var(--income-tint)' : 'var(--expense-tint)'}">${CATEGORY_ICONS[tx.category] || '💠'}</span>
      <div class="recent-info">
        <div class="recent-cat">${escapeHtml(tx.category)}</div>
        <div class="recent-desc">${escapeHtml(tx.description || 'No description')}</div>
      </div>
      <div class="recent-right">
        <div class="recent-amount amount-${tx.type}">${tx.type === 'income' ? '+' : '−'} ${formatCurrency(tx.amount)}</div>
        <div class="recent-date">${formatDate(tx.transaction_date)}</div>
      </div>
    </div>
  `).join('');
}

// ---------- Navigation ----------
function switchView(viewName) {
  document.querySelectorAll('.nav-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === viewName));
  document.querySelectorAll('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${viewName}`));

  const titles = { dashboard: 'Dashboard', transactions: 'Transactions', budgets: 'Budgets', goals: 'Goals' };
  document.getElementById('pageTitle').textContent = titles[viewName] || 'Dashboard';

  if (viewName === 'dashboard') refreshDashboard();
  if (viewName === 'transactions') refreshTransactions();
  if (viewName === 'budgets') refreshBudgets();
  if (viewName === 'goals') refreshGoals();

  // Close mobile sidebar after navigating
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarScrim').classList.remove('active');
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  const user = currentUser();
  if (user) {
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userInitial').textContent = user.name.charAt(0).toUpperCase();
  }

  // Nav clicks
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.goto));
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });

  // Mobile sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarScrim').classList.toggle('active');
  });
  document.getElementById('sidebarScrim').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarScrim').classList.remove('active');
  });

  // Modal close (backdrop + close buttons)
  document.getElementById('modalOverlay').addEventListener('click', closeAllModals);
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', closeAllModals);
  });
  document.getElementById('confirmModalOk').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeAllModals();
  });

  // Dashboard period controls
  const dashMonth = document.getElementById('dashMonth');
  const dashYear = document.getElementById('dashYear');
  populateMonthYearSelects(dashMonth, dashYear, dashState.month, dashState.year);

  dashMonth.addEventListener('change', () => { dashState.month = Number(dashMonth.value); refreshDashboard(); });
  dashYear.addEventListener('change', () => { dashState.year = Number(dashYear.value); refreshDashboard(); });

  document.querySelectorAll('#dashPeriodToggle .period-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#dashPeriodToggle .period-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      dashState.mode = btn.dataset.period;
      dashMonth.style.display = dashState.mode === 'yearly' ? 'none' : '';
      refreshDashboard();
    });
  });

  // Re-render charts with correct colors when theme changes
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', () => setTimeout(refreshDashboard, 50));

  // Initial load
  refreshDashboard();
});
