const EXPENSE_CATEGORIES = ['Food', 'Travel', 'Shopping', 'Education', 'Bills', 'Others'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Other'];

const isValidCategory = (type, category) => {
  if (type === 'expense') return EXPENSE_CATEGORIES.includes(category);
  if (type === 'income') return INCOME_CATEGORIES.includes(category);
  return false;
};

module.exports = { EXPENSE_CATEGORIES, INCOME_CATEGORIES, isValidCategory };
