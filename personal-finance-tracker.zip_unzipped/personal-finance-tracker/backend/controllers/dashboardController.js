const { pool } = require('../config/db');

// @route GET /api/dashboard?month=&year=
const getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month || now.getMonth() + 1;
    const year = req.query.year || now.getFullYear();

    const [[incomeRow]] = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions
       WHERE user_id=? AND type='income' AND MONTH(transaction_date)=? AND YEAR(transaction_date)=?`,
      [req.user.id, month, year]
    );

    const [[expenseRow]] = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions
       WHERE user_id=? AND type='expense' AND MONTH(transaction_date)=? AND YEAR(transaction_date)=?`,
      [req.user.id, month, year]
    );

    const [[budgetRow]] = await pool.query(
      `SELECT COALESCE(SUM(monthly_limit),0) as total FROM budgets WHERE user_id=? AND month=? AND year=?`,
      [req.user.id, month, year]
    );

    const totalIncome = Number(incomeRow.total);
    const totalExpense = Number(expenseRow.total);
    const totalBudget = Number(budgetRow.total);

    const [categoryBreakdown] = await pool.query(
      `SELECT category, SUM(amount) as total FROM transactions
       WHERE user_id=? AND type='expense' AND MONTH(transaction_date)=? AND YEAR(transaction_date)=?
       GROUP BY category`,
      [req.user.id, month, year]
    );

    const [recentTransactions] = await pool.query(
      `SELECT * FROM transactions WHERE user_id=? ORDER BY transaction_date DESC, id DESC LIMIT 5`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        savings: totalIncome - totalExpense,
        totalBudget,
        remainingBudget: totalBudget - totalExpense,
        categoryBreakdown,
        recentTransactions,
        month: Number(month),
        year: Number(year),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
