/* ==========================================================================
   charts.js — Chart.js rendering for the dashboard view
   ========================================================================== */

let categoryChartInstance = null;
let trendChartInstance = null;

const CATEGORY_COLORS = {
  Food: '#FF9B6A', Travel: '#4FB6E8', Shopping: '#B98BF0',
  Education: '#3FCBA5', Bills: '#F0C64D', Others: '#9AA0C0',
};

function currentTextColor() {
  return document.body.getAttribute('data-theme') === 'dark' ? '#B9B4DE' : '#5B577A';
}
function currentGridColor() {
  return document.body.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(90,80,160,0.08)';
}

function renderCategoryChart(categoryBreakdown) {
  const canvas = document.getElementById('categoryChart');
  const emptyMsg = document.getElementById('categoryChartEmpty');
  if (!canvas) return;

  if (!categoryBreakdown || categoryBreakdown.length === 0) {
    canvas.style.display = 'none';
    if (emptyMsg) emptyMsg.hidden = false;
    if (categoryChartInstance) { categoryChartInstance.destroy(); categoryChartInstance = null; }
    return;
  }
  canvas.style.display = 'block';
  if (emptyMsg) emptyMsg.hidden = true;

  const labels = categoryBreakdown.map((c) => c.category);
  const values = categoryBreakdown.map((c) => Number(c.total));
  const colors = labels.map((l) => CATEGORY_COLORS[l] || '#9AA0C0');

  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: currentTextColor(), boxWidth: 10, boxHeight: 10, padding: 14, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`,
          },
        },
      },
    },
  });
}

function renderTrendChart(monthlyTrend, year) {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const incomeByMonth = new Array(12).fill(0);
  const expenseByMonth = new Array(12).fill(0);

  (monthlyTrend || []).forEach((row) => {
    const idx = Number(row.month) - 1;
    if (row.type === 'income') incomeByMonth[idx] = Number(row.total);
    if (row.type === 'expense') expenseByMonth[idx] = Number(row.total);
  });

  if (trendChartInstance) trendChartInstance.destroy();

  trendChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: monthNames,
      datasets: [
        { label: 'Income', data: incomeByMonth, backgroundColor: '#1FAF8C', borderRadius: 5, maxBarThickness: 16 },
        { label: 'Expense', data: expenseByMonth, backgroundColor: '#F1637A', borderRadius: 5, maxBarThickness: 16 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { color: currentTextColor(), boxWidth: 10, boxHeight: 10, padding: 14, font: { size: 12 } } },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: currentTextColor(), font: { size: 11 } } },
        y: {
          grid: { color: currentGridColor() },
          ticks: { color: currentTextColor(), font: { size: 11 }, callback: (v) => '₹' + v },
          beginAtZero: true,
        },
      },
    },
  });
}
