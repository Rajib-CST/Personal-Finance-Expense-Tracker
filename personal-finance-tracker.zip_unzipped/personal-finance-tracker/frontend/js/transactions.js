/* ==========================================================================
   transactions.js — Transactions view: list, filters, search, CRUD, export
   ========================================================================== */

const txState = {
  page: 1,
  limit: 10,
  type: '',
  category: '',
  startDate: '',
  endDate: '',
  search: '',
  editingId: null,
};
let searchDebounceTimer = null;

function allCategoriesUnique() {
  return Array.from(new Set([...CATEGORIES.expense, ...CATEGORIES.income]));
}

function populateSelectWithCategories(selectEl, categories, includeAllOption) {
  selectEl.innerHTML = '';
  if (includeAllOption) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'All categories';
    selectEl.appendChild(opt);
  }
  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = `${CATEGORY_ICONS[cat] || ''} ${cat}`.trim();
    selectEl.appendChild(opt);
  });
}

function buildTransactionQuery() {
  const params = new URLSearchParams();
  params.set('page', txState.page);
  params.set('limit', txState.limit);
  if (txState.type) params.set('type', txState.type);
  if (txState.category) params.set('category', txState.category);
  if (txState.startDate) params.set('startDate', txState.startDate);
  if (txState.endDate) params.set('endDate', txState.endDate);
  if (txState.search) params.set('search', txState.search);
  return params.toString();
}

async function refreshTransactions() {
  const tbody = document.getElementById('transactionsBody');
  const emptyMsg = document.getElementById('transactionsEmpty');
  try {
    const res = await api.get(`/transactions?${buildTransactionQuery()}`);
    renderTransactionsTable(res.data);
    renderPagination(res.pagination);
    emptyMsg.hidden = res.data.length > 0;
  } catch (err) {
    showToast(err.message, 'error');
    tbody.innerHTML = '';
    emptyMsg.hidden = false;
  }
}

function renderTransactionsTable(rows) {
  const tbody = document.getElementById('transactionsBody');
  tbody.innerHTML = rows.map((tx) => {
    const dotColor = `var(--cat-${tx.category.toLowerCase()}, var(--accent))`;
    return `
    <tr>
      <td>${formatDate(tx.transaction_date)}</td>
      <td><span class="type-badge ${tx.type}">${tx.type}</span></td>
      <td><span class="cat-dot" style="--dot-color:${dotColor}">${CATEGORY_ICONS[tx.category] || ''} ${escapeHtml(tx.category)}</span></td>
      <td>${escapeHtml(tx.description || '—')}</td>
      <td class="col-right amount-${tx.type}">${tx.type === 'income' ? '+' : '−'} ${formatCurrency(tx.amount)}</td>
      <td class="col-right">
        <div class="row-actions">
          <button class="row-btn" title="Edit" onclick="editTransaction(${tx.id})" type="button">✏️</button>
          <button class="row-btn danger" title="Delete" onclick="confirmDeleteTransaction(${tx.id})" type="button">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  if (!pagination || pagination.totalPages <= 1) { container.innerHTML = ''; return; }

  const { page, totalPages } = pagination;
  let html = `<button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})" type="button">‹</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})" type="button">${i}</button>`;
    } else if (Math.abs(i - page) === 2) {
      html += `<span class="page-btn" style="background:none;cursor:default;">…</span>`;
    }
  }
  html += `<button class="page-btn" ${page === totalPages ? 'disabled' : ''} onclick="goToPage(${page + 1})" type="button">›</button>`;
  container.innerHTML = html;
}

function goToPage(page) {
  txState.page = page;
  refreshTransactions();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Add / Edit modal ----------
function setTxTypeButtons(type) {
  document.querySelectorAll('#txTypeSwitch .type-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  populateSelectWithCategories(document.getElementById('txCategory'), CATEGORIES[type], false);
}

function openAddTransactionModal() {
  txState.editingId = null;
  document.getElementById('transactionModalTitle').textContent = 'Add transaction';
  document.getElementById('txSubmitBtn').textContent = 'Save transaction';
  document.getElementById('transactionForm').reset();
  document.getElementById('txId').value = '';
  setTxTypeButtons('expense');
  document.getElementById('txDate').value = new Date().toISOString().slice(0, 10);
  openModal('transactionModal');
}

async function editTransaction(id) {
  try {
    const res = await api.get(`/transactions/${id}`);
    const tx = res.data;
    txState.editingId = id;
    document.getElementById('transactionModalTitle').textContent = 'Edit transaction';
    document.getElementById('txSubmitBtn').textContent = 'Update transaction';
    document.getElementById('txId').value = tx.id;
    setTxTypeButtons(tx.type);
    document.getElementById('txCategory').value = tx.category;
    document.getElementById('txAmount').value = tx.amount;
    document.getElementById('txDate').value = tx.transaction_date;
    document.getElementById('txDescription').value = tx.description || '';
    openModal('transactionModal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function confirmDeleteTransaction(id) {
  openConfirm('Delete transaction?', 'This transaction will be permanently removed.', async () => {
    try {
      await api.delete(`/transactions/${id}`);
      showToast('Transaction deleted', 'success');
      refreshTransactions();
      if (typeof refreshDashboard === 'function') refreshDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ---------- Init (runs once on page load) ----------
document.addEventListener('DOMContentLoaded', () => {
  populateSelectWithCategories(document.getElementById('filterCategory'), allCategoriesUnique(), true);

  document.getElementById('addTransactionBtn').addEventListener('click', openAddTransactionModal);

  document.querySelectorAll('#txTypeSwitch .type-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTxTypeButtons(btn.dataset.type));
  });

  document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const activeTypeBtn = document.querySelector('#txTypeSwitch .type-btn.active');
    const payload = {
      type: activeTypeBtn.dataset.type,
      category: document.getElementById('txCategory').value,
      amount: parseFloat(document.getElementById('txAmount').value),
      transaction_date: document.getElementById('txDate').value,
      description: document.getElementById('txDescription').value.trim() || undefined,
    };

    try {
      if (txState.editingId) {
        await api.put(`/transactions/${txState.editingId}`, payload);
        showToast('Transaction updated', 'success');
      } else {
        await api.post('/transactions', payload);
        showToast('Transaction added', 'success');
      }
      closeModal('transactionModal');
      refreshTransactions();
      if (typeof refreshDashboard === 'function') refreshDashboard();
    } catch (err) {
      showToast(err.errors ? err.errors[0].message : err.message, 'error');
    }
  });

  // Filters
  document.getElementById('filterType').addEventListener('change', (e) => {
    txState.type = e.target.value;
    txState.category = '';
    const cats = txState.type ? CATEGORIES[txState.type] : allCategoriesUnique();
    populateSelectWithCategories(document.getElementById('filterCategory'), cats, true);
    txState.page = 1;
    refreshTransactions();
  });
  document.getElementById('filterCategory').addEventListener('change', (e) => {
    txState.category = e.target.value; txState.page = 1; refreshTransactions();
  });
  document.getElementById('filterStart').addEventListener('change', (e) => {
    txState.startDate = e.target.value; txState.page = 1; refreshTransactions();
  });
  document.getElementById('filterEnd').addEventListener('change', (e) => {
    txState.endDate = e.target.value; txState.page = 1; refreshTransactions();
  });
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    txState.type = ''; txState.category = ''; txState.startDate = ''; txState.endDate = ''; txState.search = '';
    document.getElementById('filterType').value = '';
    populateSelectWithCategories(document.getElementById('filterCategory'), allCategoriesUnique(), true);
    document.getElementById('filterStart').value = '';
    document.getElementById('filterEnd').value = '';
    document.getElementById('txSearch').value = '';
    txState.page = 1;
    refreshTransactions();
  });

  document.getElementById('txSearch').addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    const value = e.target.value;
    searchDebounceTimer = setTimeout(() => {
      txState.search = value.trim();
      txState.page = 1;
      refreshTransactions();
    }, 350);
  });

  document.getElementById('exportCsvBtn').addEventListener('click', async () => {
    try {
      const blob = await api.get('/transactions/export/csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transactions.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('CSV export started', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
});
