-- ============================================
-- CASH FLOW - Database Setup
-- Run this in phpMyAdmin (XAMPP)
-- ============================================

-- Create the database
CREATE DATABASE IF NOT EXISTS cash_flow_db;
USE cash_flow_db;

-- ============================================
-- TABLE 1: Users Table
-- Stores user login information
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,  -- Hashed password
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username)
) ENGINE=InnoDB;

-- ============================================
-- TABLE 2: Categories Table
-- Pre-defined expense/income categories
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(20) DEFAULT '💰',
    color VARCHAR(7) DEFAULT '#000000',
    INDEX idx_type (type)
) ENGINE=InnoDB;

-- ============================================
-- TABLE 3: Transactions Table
-- Stores all income and expense records
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_user_date (user_id, transaction_date),
    INDEX idx_user_type (user_id, type),
    INDEX idx_date (transaction_date)
) ENGINE=InnoDB;

-- ============================================
-- TABLE 4: Budgets Table (Optional)
-- Monthly budget limits per category
-- ============================================
CREATE TABLE IF NOT EXISTS budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    monthly_limit DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_budget (user_id, category_id)
) ENGINE=InnoDB;

-- ============================================
-- Insert Default Categories
-- These are the pre-loaded categories
-- ============================================
INSERT INTO categories (name, type, icon, color) VALUES
-- Expense Categories
('Food & Dining', 'expense', '🍔', '#FF6B6B'),
('Transportation', 'expense', '🚗', '#4ECDC4'),
('Bills & Utilities', 'expense', '💡', '#45B7D1'),
('Shopping', 'expense', '🛍️', '#96CEB4'),
('Entertainment', 'expense', '🎬', '#FFEAA7'),
('Healthcare', 'expense', '🏥', '#DDA0DD'),
('Education', 'expense', '📚', '#98D8C8'),
('Rent & Housing', 'expense', '🏠', '#F7DC6F'),
('Other Expenses', 'expense', '📌', '#B0BEC5'),
-- Income Categories
('Salary', 'income', '💼', '#2ECC71'),
('Freelance', 'income', '💻', '#3498DB'),
('Business', 'income', '🏢', '#9B59B6'),
('Investment', 'income', '📈', '#1ABC9C'),
('Other Income', 'income', '💵', '#F39C12');