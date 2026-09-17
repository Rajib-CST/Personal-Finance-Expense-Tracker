const { pool } = require('../config/db');

// @route POST /api/goals
const createGoal = async (req, res, next) => {
  try {
    const { name, target_amount, current_amount, deadline } = req.body;

    const [result] = await pool.query(
      `INSERT INTO goals (user_id, name, target_amount, current_amount, deadline)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, name, target_amount, current_amount || 0, deadline || null]
    );

    const [rows] = await pool.query('SELECT * FROM goals WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Goal created', data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/goals
const getGoals = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    const withProgress = rows.map((g) => {
      const target = Number(g.target_amount);
      return {
        ...g,
        progressPercent: target > 0 ? Math.min(100, Math.round((Number(g.current_amount) / target) * 100)) : 0,
      };
    });
    res.json({ success: true, data: withProgress });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/goals/:id
const updateGoal = async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT * FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Goal not found' });

    const current = existing[0];
    const name = req.body.name ?? current.name;
    const target_amount = req.body.target_amount ?? current.target_amount;
    const current_amount = req.body.current_amount ?? current.current_amount;
    const deadline = req.body.deadline !== undefined ? req.body.deadline : current.deadline;

    await pool.query(
      `UPDATE goals SET name = ?, target_amount = ?, current_amount = ?, deadline = ? WHERE id = ? AND user_id = ?`,
      [name, target_amount, current_amount, deadline, req.params.id, req.user.id]
    );

    const [rows] = await pool.query('SELECT * FROM goals WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Goal updated', data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/goals/:id
const deleteGoal = async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createGoal, getGoals, updateGoal, deleteGoal };
