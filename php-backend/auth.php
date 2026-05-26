<?php
// ============================================
// AUTHENTICATION HANDLER
// Handles: Signup, Login, Logout
// ============================================

// Include database configuration
require_once 'config.php';

// Start session
startSecureSession();

// Set header for JSON response
header('Content-Type: application/json');

// Get the action from request
 $action = $_POST['action'] ?? $_GET['action'] ?? '';

// ============================================
// ROUTE: Handle different actions
// ============================================
switch($action) {
    case 'signup':
        handleSignup();
        break;
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    default:
        errorResponse('Invalid action');
}

// ============================================
// FUNCTION: Handle User Signup
// ============================================
function handleSignup() {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Get and sanitize inputs
    $username = sanitize($_POST['username'] ?? '');
    $email = sanitize($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    
    // ============================================
    // VALIDATION: Check all required fields
    // ============================================
    
    // Check if fields are empty
    if (empty($username) || empty($email) || empty($password)) {
        errorResponse('All fields are required');
    }
    
    // Validate username length
    if (strlen($username) < 3 || strlen($username) > 50) {
        errorResponse('Username must be 3-50 characters');
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        errorResponse('Invalid email format');
    }
    
    // Validate password length
    if (strlen($password) < 6) {
        errorResponse('Password must be at least 6 characters');
    }
    
    // Check if passwords match
    if ($password !== $confirmPassword) {
        errorResponse('Passwords do not match');
    }
    
    // ============================================
    // CHECK: If username or email already exists
    // ============================================
    try {
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        
        if ($stmt->fetch()) {
            errorResponse('Username or email already exists');
        }
        
        // ============================================
        // CREATE: New user account
        // ============================================
        
        // Hash password securely (never store plain text!)
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        $stmt->execute([$username, $email, $hashedPassword]);
        
        $userId = $conn->lastInsertId();
        
        // Set session variables
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['logged_in'] = true;
        
        successResponse(['user_id' => $userId, 'username' => $username], 'Account created successfully');
        
    } catch(PDOException $e) {
        errorResponse('Registration failed. Please try again.');
    }
    
    $db->close();
}

// ============================================
// FUNCTION: Handle User Login
// ============================================
function handleLogin() {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Get and sanitize inputs
    $email = sanitize($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    
    // Validate inputs
    if (empty($email) || empty($password)) {
        errorResponse('Email and password are required');
    }
    
    try {
        // Find user by email
        $stmt = $conn->prepare("SELECT id, username, password FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        // Check if user exists and password is correct
        if ($user && password_verify($password, $user['password'])) {
            // Set session variables
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['logged_in'] = true;
            
            successResponse([
                'user_id' => $user['id'],
                'username' => $user['username']
            ], 'Login successful');
        } else {
            errorResponse('Invalid email or password');
        }
        
    } catch(PDOException $e) {
        errorResponse('Login failed. Please try again.');
    }
    
    $db->close();
}

// ============================================
// FUNCTION: Handle User Logout
// ============================================
function handleLogout() {
    // Clear all session variables
    $_SESSION = array();
    
    // Destroy the session
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    session_destroy();
    
    successResponse([], 'Logged out successfully');
}

?>