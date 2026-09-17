const { pool } = require('../config/db');
const { EXPENSE_CATEGORIES } = require('../utils/constants');

// @route POST /api/budgets  (creates or updates the budget for a category/month/year)
const setBudget = async (req, res, next) => {
  try {
    const { category, monthly_limit, month, year } = req.body;

    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `'${category}' is not a valid expense category` });
    }

    await pool.query(
      `INSERT INTO budgets (user_id, category, monthly_limit, month, year)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE monthly_limit = VALUES(monthly_limit)`,
      [req.user.id, category, monthly_limit, month, year]
    );

    const [rows] = await pool.query(
      'SELECT * FROM budgets WHERE user_id = ? AND category = ? AND month = ? AND year = ?',
      [req.user.id, category, month, year]
    );

    res.status(201).json({ success: true, message: 'Budget saved', data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/budgets?month=&year=
const getBudgets = async (req, res, next) => {
  try {
    const now = new Date();
    const m = req.query.month || now.getMonth() + 1;
    const y = req.query.year || now.getFullYear();

    const [budgets] = await pool.query(
      'SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ? ORDER BY category',
      [req.user.id, m, y]
    );

    const [spent] = await pool.query(
      `SELECT category, SUM(amount) as spent FROM transactions
       WHERE user_id = ? AND type = 'expense' AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?
       GROUP BY category`,
      [req.user.id, m, y]
    );

    const spentMap = {};
    spent.forEach((s) => { spentMap[s.category] = Number(s.spent); });

    const result = budgets.map((b) => {
      const amountSpent = spentMap[b.category] || 0;
      const limit = Number(b.monthly_limit);
      return {
        ...b,
        spent: amountSpent,
        remaining: limit - amountSpent,
        percentUsed: limit > 0 ? Math.min(100, Math.round((amountSpent / limit) * 100)) : 0,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/budgets/:id
const deleteBudget = async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM budgets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.json({ success: true, message: 'Budget deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { setBudget, getBudgets, deleteBudget };
