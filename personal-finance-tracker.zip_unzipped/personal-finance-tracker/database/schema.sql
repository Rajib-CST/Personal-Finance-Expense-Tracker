-- ============================================================
-- Personal Finance and Expense Tracker — Database Schema
-- Engine: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS finance_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE finance_tracker;

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,          -- bcrypt hash, never plain text
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Transactions (income + expense records)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL,
  type              ENUM('income', 'expense') NOT NULL,
  category          VARCHAR(50) NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  description       VARCHAR(255),
  transaction_date  DATE NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, transaction_date),
  INDEX idx_user_category (user_id, category),
  INDEX idx_user_type (user_id, type)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Budgets (one row per user + category + month + year)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  category       VARCHAR(50) NOT NULL,
  monthly_limit  DECIMAL(12,2) NOT NULL,
  month          TINYINT NOT NULL,   -- 1-12
  year           SMALLINT NOT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_budget (user_id, category, month, year)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Financial goals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  name            VARCHAR(150) NOT NULL,
  target_amount   DECIMAL(12,2) NOT NULL,
  current_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  deadline        DATE NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Notes:
--   * Categories are validated in the application layer (see
--     backend/utils/constants.js) rather than as a DB ENUM, so
--     the category list can be extended without a migration.
--     Expense: Food, Travel, Shopping, Education, Bills, Others
--     Income:  Salary, Freelance, Business, Investment, Other
-- ------------------------------------------------------------
