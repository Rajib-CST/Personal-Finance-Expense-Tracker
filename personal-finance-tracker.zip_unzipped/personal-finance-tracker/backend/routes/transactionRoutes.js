const express = require('express');
const { body } = require('express-validator');
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  exportCSV,
  getSummary,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();
router.use(protect);

const transactionValidation = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('transaction_date').isISO8601().withMessage('A valid date is required'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 255 }),
];

// Specific routes before the /:id catch-alls
router.get('/export/csv', exportCSV);
router.get('/summary', getSummary);

router.get('/', getTransactions);
router.post('/', transactionValidation, validate, createTransaction);
router.get('/:id', getTransactionById);
router.put('/:id', transactionValidation, validate, updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
