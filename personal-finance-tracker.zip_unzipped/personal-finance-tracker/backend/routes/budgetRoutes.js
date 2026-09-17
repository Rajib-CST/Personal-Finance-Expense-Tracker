const express = require('express');
const { body } = require('express-validator');
const { setBudget, getBudgets, deleteBudget } = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();
router.use(protect);

router.post(
  '/',
  [
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('monthly_limit').isFloat({ gt: 0 }).withMessage('Monthly limit must be a positive number'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('Year is invalid'),
  ],
  validate,
  setBudget
);

router.get('/', getBudgets);
router.delete('/:id', deleteBudget);

module.exports = router;
