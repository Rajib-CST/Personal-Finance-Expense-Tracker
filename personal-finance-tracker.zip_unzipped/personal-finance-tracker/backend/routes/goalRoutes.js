const express = require('express');
const { body } = require('express-validator');
const { createGoal, getGoals, updateGoal, deleteGoal } = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();
router.use(protect);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Goal name is required').isLength({ max: 150 }),
    body('target_amount').isFloat({ gt: 0 }).withMessage('Target amount must be a positive number'),
    body('current_amount').optional().isFloat({ min: 0 }).withMessage('Current amount cannot be negative'),
    body('deadline').optional({ nullable: true }).isISO8601().withMessage('Deadline must be a valid date'),
  ],
  validate,
  createGoal
);

router.get('/', getGoals);

router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty().isLength({ max: 150 }),
    body('target_amount').optional().isFloat({ gt: 0 }),
    body('current_amount').optional().isFloat({ min: 0 }),
    body('deadline').optional({ nullable: true }).isISO8601(),
  ],
  validate,
  updateGoal
);

router.delete('/:id', deleteGoal);

module.exports = router;
