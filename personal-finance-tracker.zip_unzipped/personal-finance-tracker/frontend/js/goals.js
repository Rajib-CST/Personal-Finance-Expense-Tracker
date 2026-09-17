/* ==========================================================================
   goals.js — Financial goals view: create, edit, contribute, delete
   ========================================================================== */

async function refreshGoals() {
  const grid = document.getElementById('goalsGrid');
  const emptyMsg = document.getElementById('goalsEmpty');
  try {
    const res = await api.get('/goals');
    renderGoalsGrid(res.data);
    emptyMsg.hidden = res.data.length > 0;
  } catch (err) {
    showToast(err.message, 'error');
    grid.innerHTML = '';
    emptyMsg.hidden = false;
  }
}

function renderGoalsGrid(goals) {
  const grid = document.getElementById('goalsGrid');
  grid.innerHTML = goals.map((g) => {
    const pct = g.progressPercent;
    const isComplete = pct >= 100;
    const fillClass = isComplete ? '' : pct >= 75 ? 'warn' : '';
    const deadlineLabel = g.deadline ? `Target date: ${formatDate(g.deadline)}` : 'No target date set';

    return `
    <div class="goal-card glass">
      <div class="goal-card-head">
        <span class="goal-card-title">🏆 ${escapeHtml(g.name)}</span>
        ${isComplete ? '<span class="goal-complete-badge">Achieved 🎉</span>' : ''}
      </div>
      <div class="goal-amounts">${formatCurrency(g.current_amount)} <span class="goal-target">of ${formatCurrency(g.target_amount)}</span></div>
      <div class="progress-track"><div class="progress-fill ${fillClass}" style="width:${pct}%"></div></div>
      <div class="goal-meta">
        <span>${pct}% complete</span>
        <span class="goal-deadline">${deadlineLabel}</span>
      </div>
      <div class="goal-card-actions">
        <button class="btn-secondary" style="flex:1" onclick="openContributeModal(${g.id})" type="button">+ Add funds</button>
        <button class="row-btn" title="Edit" onclick="editGoal(${g.id})" type="button">✏️</button>
        <button class="row-btn danger" title="Delete" onclick="confirmDeleteGoal(${g.id})" type="button">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

let goalsCache = [];

async function editGoal(id) {
  try {
    if (!goalsCache.length) {
      const res = await api.get('/goals');
      goalsCache = res.data;
    }
    const goal = goalsCache.find((g) => g.id === id) || (await api.get('/goals')).data.find((g) => g.id === id);
    document.getElementById('goalModalTitle').textContent = 'Edit goal';
    document.getElementById('goalId').value = goal.id;
    document.getElementById('goalName').value = goal.name;
    document.getElementById('goalTarget').value = goal.target_amount;
    document.getElementById('goalCurrent').value = goal.current_amount;
    document.getElementById('goalDeadline').value = goal.deadline || '';
    openModal('goalModal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function confirmDeleteGoal(id) {
  openConfirm('Delete goal?', 'This financial goal will be permanently removed.', async () => {
    try {
      await api.delete(`/goals/${id}`);
      showToast('Goal deleted', 'success');
      refreshGoals();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function openContributeModal(id) {
  document.getElementById('contributeGoalId').value = id;
  document.getElementById('contributeForm').reset();
  openModal('contributeModal');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addGoalBtn').addEventListener('click', () => {
    document.getElementById('goalForm').reset();
    document.getElementById('goalModalTitle').textContent = 'New financial goal';
    document.getElementById('goalId').value = '';
    document.getElementById('goalCurrent').value = 0;
    openModal('goalModal');
  });

  document.getElementById('goalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('goalId').value;
    const payload = {
      name: document.getElementById('goalName').value.trim(),
      target_amount: parseFloat(document.getElementById('goalTarget').value),
      current_amount: parseFloat(document.getElementById('goalCurrent').value) || 0,
      deadline: document.getElementById('goalDeadline').value || null,
    };
    try {
      if (id) {
        await api.put(`/goals/${id}`, payload);
        showToast('Goal updated', 'success');
      } else {
        await api.post('/goals', payload);
        showToast('Goal created', 'success');
      }
      closeModal('goalModal');
      refreshGoals();
    } catch (err) {
      showToast(err.errors ? err.errors[0].message : err.message, 'error');
    }
  });

  document.getElementById('contributeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('contributeGoalId').value;
    const addAmount = parseFloat(document.getElementById('contributeAmount').value);
    try {
      const res = await api.get('/goals');
      const goal = res.data.find((g) => g.id === Number(id));
      const newAmount = Number(goal.current_amount) + addAmount;
      await api.put(`/goals/${id}`, { current_amount: newAmount });
      showToast('Contribution added', 'success');
      closeModal('contributeModal');
      refreshGoals();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
});
