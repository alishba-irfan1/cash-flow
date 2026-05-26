<?php
// ============================================
// DATABASE CONFIGURATION
// Change these values to match your XAMPP setup
// ============================================

// Database settings
define('DB_HOST', 'localhost');      // Usually 'localhost' for XAMPP
define('DB_USER', 'root');           // Default XAMPP username
define('DB_PASS', '');               // Default XAMPP password (empty)
define('DB_NAME', 'cash_flow_db');   // Database name from setup.sql

// Application settings
define('APP_NAME', 'Cash Flow');
define('SESSION_TIMEOUT', 3600);     // 1 hour session timeout

// ============================================
// DATABASE CONNECTION CLASS
// Uses PDO for security (prevents SQL injection)
// ============================================
class Database {
    private $host = DB_HOST;
    private $user = DB_USER;
    private $pass = DB_PASS;
    private $dbname = DB_NAME;
    private $conn;
    
    // Connect to database when object is created
    public function __construct() {
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->dbname};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,  // Important for security
            ];
            $this->conn = new PDO($dsn, $this->user, $this->pass, $options);
        } catch(PDOException $e) {
            // Show error in development, log in production
            die("Database Connection Failed: " . $e->getMessage());
        }
    }
    
    // Get the connection object
    public function getConnection() {
        return $this->conn;
    }
    
    // Close connection
    public function close() {
        $this->conn = null;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Start secure session
function startSecureSession() {
    if (session_status() === PHP_SESSION_NONE) {
        // Set secure session parameters
        ini_set('session.use_strict_mode', 1);
        ini_set('session.use_only_cookies', 1);
        session_start();
    }
}

// Check if user is logged in
function isLoggedIn() {
    startSecureSession();
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

// Get current user ID
function getCurrentUserId() {
    startSecureSession();
    return $_SESSION['user_id'] ?? null;
}

// Require login - redirect if not logged in
function requireLogin() {
    if (!isLoggedIn()) {
        header('Location: ../index.html');
        exit();
    }
}

// Sanitize input (prevent XSS)
function sanitize($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

// Return JSON response
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

// Return error JSON response
function errorResponse($message, $statusCode = 400) {
    jsonResponse(['success' => false, 'message' => $message], $statusCode);
}

// Return success JSON response
function successResponse($data = [], $message = 'Success') {
    jsonResponse(['success' => true, 'message' => $message, 'data' => $data]);
}

?>