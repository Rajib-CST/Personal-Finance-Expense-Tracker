const { pool } = require('../config/db');
const { isValidCategory } = require('../utils/constants');

// @route POST /api/transactions
const createTransaction = async (req, res, next) => {
  try {
    const { type, category, amount, description, transaction_date } = req.body;

    if (!isValidCategory(type, category)) {
      return res.status(400).json({ success: false, message: `'${category}' is not a valid category for ${type}` });
    }

    const [result] = await pool.query(
      `INSERT INTO transactions (user_id, type, category, amount, description, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, type, category, amount, description || null, transaction_date]
    );

    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Transaction added', data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/transactions
const getTransactions = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, search, month, year, page = 1, limit = 20 } = req.query;

    const conditions = ['user_id = ?'];
    const params = [req.user.id];

    if (type) { conditions.push('type = ?'); params.push(type); }
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (startDate) { conditions.push('transaction_date >= ?'); params.push(startDate); }
    if (endDate) { conditions.push('transaction_date <= ?'); params.push(endDate); }
    if (month) { conditions.push('MONTH(transaction_date) = ?'); params.push(month); }
    if (year) { conditions.push('YEAR(transaction_date) = ?'); params.push(year); }
    if (search) {
      conditions.push('(description LIKE ? OR category LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');
    const safeLimit = Math.min(Number(limit) || 20, 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const [rows] = await pool.query(
      `SELECT * FROM transactions WHERE ${whereClause} ORDER BY transaction_date DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM transactions WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: countRows[0].total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(countRows[0].total / safeLimit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/transactions/:id
const getTransactionById = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/transactions/:id
const updateTransaction = async (req, res, next) => {
  try {
    const { type, category, amount, description, transaction_date } = req.body;

    const [existing] = await pool.query('SELECT id FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Transaction not found' });

    if (!isValidCategory(type, category)) {
      return res.status(400).json({ success: false, message: `'${category}' is not a valid category for ${type}` });
    }

    await pool.query(
      `UPDATE transactions SET type = ?, category = ?, amount = ?, description = ?, transaction_date = ?
       WHERE id = ? AND user_id = ?`,
      [type, category, amount, description || null, transaction_date, req.params.id, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Transaction updated', data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/transactions/:id
const deleteTransaction = async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/transactions/export/csv
const exportCSV = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT type, category, amount, description, transaction_date FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC',
      [req.user.id]
    );

    const header = 'Type,Category,Amount,Description,Date\n';
    const csvRows = rows.map((r) => {
      const desc = (r.description || '').replace(/"/g, '""');
      return `${r.type},${r.category},${r.amount},"${desc}",${r.transaction_date}`;
    });
    const csv = header + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

// @route GET /api/transactions/summary
const getSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const conditions = ['user_id = ?', 'YEAR(transaction_date) = ?'];
    const params = [req.user.id, currentYear];

    if (month) {
      conditions.push('MONTH(transaction_date) = ?');
      params.push(month);
    }

    const whereClause = conditions.join(' AND ');

    const [totals] = await pool.query(
      `SELECT type, SUM(amount) as total FROM transactions WHERE ${whereClause} GROUP BY type`,
      params
    );

    const [byCategory] = await pool.query(
      `SELECT type, category, SUM(amount) as total FROM transactions WHERE ${whereClause} GROUP BY type, category`,
      params
    );

    const [monthlyTrend] = await pool.query(
      `SELECT MONTH(transaction_date) as month, type, SUM(amount) as total
       FROM transactions WHERE user_id = ? AND YEAR(transaction_date) = ?
       GROUP BY MONTH(transaction_date), type ORDER BY month`,
      [req.user.id, currentYear]
    );

    res.json({ success: true, data: { totals, byCategory, monthlyTrend } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  exportCSV,
  getSummary,
};
