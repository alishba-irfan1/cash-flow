<?php
require_once 'config.php';
startSecureSession();
header('Content-Type: application/json');

if (!isLoggedIn()) {
    errorResponse('Not authenticated', 401);
}

 $action = $_POST['action'] ?? $_GET['action'] ?? '';
 $userId = getCurrentUserId();

switch($action) {
    case 'add': addTransaction($userId); break;
    case 'edit': editTransaction($userId); break;
    case 'delete': deleteTransaction($userId); break;
    case 'get_all': getTransactions($userId); break;
    case 'get_summary': getSummary($userId); break;
    case 'search': searchTransactions($userId); break;
    case 'get_categories': getCategories(); break;
    case 'add_budget': addBudget($userId); break;
    case 'get_budgets': getBudgets($userId); break;
    default: errorResponse('Invalid action');
}

function addTransaction($userId) {
    $db = new Database(); $conn = $db->getConnection();
    $categoryId = (int)($_POST['category_id'] ?? 0);
    $type = sanitize($_POST['type'] ?? '');
    $amount = (float)($_POST['amount'] ?? 0);
    $description = sanitize($_POST['description'] ?? '');
    $date = sanitize($_POST['date'] ?? date('Y-m-d'));

    if ($categoryId <= 0) errorResponse('Please select a category');
    if (!in_array($type, ['income', 'expense'])) errorResponse('Invalid transaction type');
    if ($amount <= 0) errorResponse('Amount must be greater than 0');

    try {
        $stmt = $conn->prepare("INSERT INTO transactions (user_id, category_id, type, amount, description, transaction_date) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $categoryId, $type, $amount, $description, $date]);
        $id = $conn->lastInsertId();
        
        $stmt = $conn->prepare("SELECT t.*, c.name as category_name, c.icon, c.color FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.id = ?");
        $stmt->execute([$id]);
        successResponse($stmt->fetch(), 'Transaction added successfully');
    } catch(PDOException $e) { errorResponse('Failed to add transaction'); }
    $db->close();
}

function editTransaction($userId) {
    $db = new Database(); $conn = $db->getConnection();
    $id = (int)($_POST['transaction_id'] ?? 0);
    $categoryId = (int)($_POST['category_id'] ?? 0);
    $type = sanitize($_POST['type'] ?? '');
    $amount = (float)($_POST['amount'] ?? 0);
    $description = sanitize($_POST['description'] ?? '');
    $date = sanitize($_POST['date'] ?? '');

    if ($id <= 0 || $amount <= 0) errorResponse('Invalid data');

    try {
        $stmt = $conn->prepare("SELECT id FROM transactions WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        if (!$stmt->fetch()) errorResponse('Transaction not found');

        $stmt = $conn->prepare("UPDATE transactions SET category_id = ?, type = ?, amount = ?, description = ?, transaction_date = ? WHERE id = ? AND user_id = ?");
        $stmt->execute([$categoryId, $type, $amount, $description, $date, $id, $userId]);
        successResponse([], 'Transaction updated successfully');
    } catch(PDOException $e) { errorResponse('Failed to update transaction'); }
    $db->close();
}

function deleteTransaction($userId) {
    $db = new Database(); $conn = $db->getConnection();
    $id = (int)($_POST['transaction_id'] ?? 0);
    if ($id <= 0) errorResponse('Invalid transaction');
    try {
        $stmt = $conn->prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        if ($stmt->rowCount() > 0) successResponse([], 'Transaction deleted successfully');
        else errorResponse('Transaction not found');
    } catch(PDOException $e) { errorResponse('Failed to delete transaction'); }
    $db->close();
}

function getTransactions($userId) {
    $db = new Database(); $conn = $db->getConnection();
    $limit = (int)($_GET['limit'] ?? 50);
    $type = sanitize($_GET['type'] ?? '');
    try {
        $sql = "SELECT t.*, c.name as category_name, c.icon, c.color FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ?";
        $params = [$userId];
        if (in_array($type, ['income', 'expense'])) { $sql .= " AND t.type = ?"; $params[] = $type; }
        $sql .= " ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ?";
        $params[] = $limit;
        $stmt = $conn->prepare($sql); $stmt->execute($params);
        successResponse($stmt->fetchAll());
    } catch(PDOException $e) { errorResponse('Failed to fetch transactions'); }
    $db->close();
}

function getSummary($userId) {
    $db = new Database(); $conn = $db->getConnection();
    $period = sanitize($_GET['period'] ?? 'all');
    $date = sanitize($_GET['date'] ?? date('Y-m-d'));
    try {
        $dateCondition = "1=1"; $params = [$userId];
        if ($period === 'daily') { $dateCondition = "transaction_date = ?"; $params = [$userId, $date]; }
        elseif ($period === 'weekly') { $ws = date('Y-m-d', strtotime('monday this week', strtotime($date))); $we = date('Y-m-d', strtotime('sunday this week', strtotime($date))); $dateCondition = "transaction_date BETWEEN ? AND ?"; $params = [$userId, $ws, $we]; }
        elseif ($period === 'monthly') { $ms = date('Y-m-01', strtotime($date)); $me = date('Y-m-t', strtotime($date)); $dateCondition = "transaction_date BETWEEN ? AND ?"; $params = [$userId, $ms, $me]; }

        $sql = "SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income, COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses, COUNT(*) as total_transactions FROM transactions WHERE user_id = ? AND $dateCondition";
        $stmt = $conn->prepare($sql); $stmt->execute($params);
        $summary = $stmt->fetch();
        $summary['balance'] = $summary['total_income'] - $summary['total_expenses'];

        $catSql = "SELECT c.name, c.icon, c.color, SUM(t.amount) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND t.type = 'expense' AND $dateCondition GROUP BY t.category_id ORDER BY total DESC";
        $stmt = $conn->prepare($catSql); $stmt->execute($params);
        $summary['category_breakdown'] = $stmt->fetchAll();
        successResponse($summary);
    } catch(PDOException $e) { errorResponse('Failed to fetch summary'); }
    $db->close();
}

function searchTransactions($userId) {
    $db = new Database(); $conn = $db->getConnection();
    $query = sanitize($_GET['q'] ?? '');
    if (empty($query)) errorResponse('Search query is required');
    try {
        $stmt = $conn->prepare("SELECT t.*, c.name as category_name, c.icon, c.color FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND (t.description LIKE ? OR c.name LIKE ?) ORDER BY t.transaction_date DESC LIMIT 50");
        $searchTerm = "%$query%"; $stmt->execute([$userId, $searchTerm, $searchTerm]);
        successResponse($stmt->fetchAll());
    } catch(PDOException $e) { errorResponse('Search failed'); }
    $db->close();
}

function getCategories() {
    $db = new Database(); $conn = $db->getConnection();
    $type = sanitize($_GET['type'] ?? '');
    try {
        $sql = "SELECT * FROM categories"; $params = [];
        if (in_array($type, ['income', 'expense'])) { $sql .= " WHERE type = ?"; $params[] = $type; }
        $sql .= " ORDER BY type, name";
        $stmt = $conn->prepare($sql); $stmt->execute($params);
        successResponse($stmt->fetchAll());
    } catch(PDOException $e) { errorResponse('Failed to fetch categories'); }
    $db->close();
}

// --- NEW BUDGET FUNCTIONS ---
function addBudget($userId) {
    $db = new Database(); $conn = $db->getConnection();
    $categoryId = (int)($_POST['category_id'] ?? 0);
    $amount = (float)($_POST['amount'] ?? 0);
    if ($categoryId <= 0 || $amount <= 0) errorResponse('Invalid category or amount');
    try {
        $stmt = $conn->prepare("REPLACE INTO budgets (user_id, category_id, monthly_limit) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $categoryId, $amount]);
        successResponse([], 'Budget saved successfully');
    } catch(PDOException $e) { errorResponse('Failed to save budget'); }
    $db->close();
}

function getBudgets($userId) {
    $db = new Database(); $conn = $db->getConnection();
    try {
        $stmt = $conn->prepare("
            SELECT b.category_id, b.monthly_limit, c.name, c.icon,
                   COALESCE(SUM(t.amount), 0) as spent
            FROM budgets b
            JOIN categories c ON b.category_id = c.id
            LEFT JOIN transactions t ON b.category_id = t.category_id 
                AND t.user_id = ? AND t.type = 'expense'
                AND MONTH(t.transaction_date) = MONTH(CURDATE())
                AND YEAR(t.transaction_date) = YEAR(CURDATE())
            WHERE b.user_id = ?
            GROUP BY b.category_id
        ");
        $stmt->execute([$userId, $userId]);
        successResponse($stmt->fetchAll());
    } catch(PDOException $e) { errorResponse('Failed to fetch budgets'); }
    $db->close();
}
?>