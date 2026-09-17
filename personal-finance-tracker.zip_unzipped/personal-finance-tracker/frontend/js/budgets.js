/* ==========================================================================
   budgets.js — Budgets view: set per-category monthly limits, track spend
   ========================================================================== */

const budgetState = { month: new Date().getMonth() + 1, year: new Date().getFullYear() };

async function refreshBudgets() {
  const grid = document.getElementById('budgetsGrid');
  const emptyMsg = document.getElementById('budgetsEmpty');
  try {
    const res = await api.get(`/budgets?month=${budgetState.month}&year=${budgetState.year}`);
    renderBudgetsGrid(res.data);
    emptyMsg.hidden = res.data.length > 0;
  } catch (err) {
    showToast(err.message, 'error');
    grid.innerHTML = '';
    emptyMsg.hidden = false;
  }
}

function renderBudgetsGrid(budgets) {
  const grid = document.getElementById('budgetsGrid');
  grid.innerHTML = budgets.map((b) => {
    const pct = b.percentUsed;
    const fillClass = pct >= 100 ? 'over' : pct >= 75 ? 'warn' : '';
    const remainingLabel = b.remaining >= 0
      ? `${formatCurrency(b.remaining)} left`
      : `${formatCurrency(Math.abs(b.remaining))} over budget`;

    return `
    <div class="budget-card glass">
      <div class="budget-card-head">
        <span class="budget-card-title">${CATEGORY_ICONS[b.category] || ''} ${escapeHtml(b.category)}</span>
        <button class="row-btn danger" title="Delete budget" onclick="confirmDeleteBudget(${b.id})" type="button">🗑️</button>
      </div>
      <div class="budget-figures">
        <span class="budget-spent">${formatCurrency(b.spent)}</span>
        <span class="budget-limit">of ${formatCurrency(b.monthly_limit)}</span>
      </div>
      <div class="progress-track"><div class="progress-fill ${fillClass}" style="width:${pct}%"></div></div>
      <div class="budget-meta">
        <span>${pct}% used</span>
        <span>${remainingLabel}</span>
      </div>
    </div>`;
  }).join('');
}

function confirmDeleteBudget(id) {
  openConfirm('Delete budget?', 'This budget limit will be removed for this month.', async () => {
    try {
      await api.delete(`/budgets/${id}`);
      showToast('Budget deleted', 'success');
      refreshBudgets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const monthSelect = document.getElementById('budgetMonth');
  const yearSelect = document.getElementById('budgetYear');
  populateMonthYearSelects(monthSelect, yearSelect, budgetState.month, budgetState.year);

  monthSelect.addEventListener('change', () => { budgetState.month = Number(monthSelect.value); refreshBudgets(); });
  yearSelect.addEventListener('change', () => { budgetState.year = Number(yearSelect.value); refreshBudgets(); });

  document.getElementById('addBudgetBtn').addEventListener('click', () => {
    document.getElementById('budgetForm').reset();
    populateSelectWithCategories(document.getElementById('budgetCategory'), CATEGORIES.expense, false);
    const monthName = new Date(budgetState.year, budgetState.month - 1, 1).toLocaleString('en-IN', { month: 'long' });
    document.getElementById('budgetPeriodHint').textContent = `This sets the limit for ${monthName} ${budgetState.year}. Change the month/year on the Budgets page to set a different period.`;
    openModal('budgetModal');
  });

  document.getElementById('budgetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      category: document.getElementById('budgetCategory').value,
      monthly_limit: parseFloat(document.getElementById('budgetLimit').value),
      month: budgetState.month,
      year: budgetState.year,
    };
    try {
      await api.post('/budgets', payload);
      showToast('Budget saved', 'success');
      closeModal('budgetModal');
      refreshBudgets();
      if (typeof refreshDashboard === 'function') refreshDashboard();
    } catch (err) {
      showToast(err.errors ? err.errors[0].message : err.message, 'error');
    }
  });
});
