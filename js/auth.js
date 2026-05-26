// ============================================
// AUTHENTICATION JAVASCRIPT
// Handles login, signup, and tab switching
// ============================================

// PHP Backend URL
const API_URL = 'php-backend/auth.php';

// ============================================
// FUNCTION: Switch between Login and Signup tabs
// ============================================
function showTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabs = document.querySelectorAll('.auth-tab');
    const alert = document.getElementById('authAlert');
    
    // Hide alert when switching tabs
    alert.classList.remove('show');
    
    if (tab === 'login') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

// ============================================
// FUNCTION: Show alert message
// ============================================
function showAlert(message, type = 'error') {
    const alert = document.getElementById('authAlert');
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
    }, 5000);
}

// ============================================
// FUNCTION: Show/Hide loading overlay
// ============================================
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

// ============================================
// FUNCTION: Handle Login Form Submit
// ============================================
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    
    // Show loading state
    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled = true;
    
    try {
        // Send login request to PHP backend
        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('email', email);
        formData.append('password', password);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success message
            showAlert('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            // Show error message
            showAlert(data.message);
        }
        
    } catch (error) {
        showAlert('Network error. Please try again.');
        console.error('Login error:', error);
    } finally {
        // Reset button state
        btn.innerHTML = '<span>Login</span>';
        btn.disabled = false;
    }
}

// ============================================
// FUNCTION: Handle Signup Form Submit
// ============================================
async function handleSignup(event) {
    event.preventDefault();
    
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const btn = document.getElementById('signupBtn');
    
    // Client-side validation
    if (password !== confirmPassword) {
        showAlert('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters');
        return;
    }
    
    // Show loading state
    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled = true;
    
    try {
        // Send signup request to PHP backend
        const formData = new FormData();
        formData.append('action', 'signup');
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('confirm_password', confirmPassword);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success message
            showAlert('Account created successfully! Redirecting...', 'success');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            // Show error message
            showAlert(data.message);
        }
        
    } catch (error) {
        showAlert('Network error. Please try again.');
        console.error('Signup error:', error);
    } finally {
        // Reset button state
        btn.innerHTML = '<span>Create Account</span>';
        btn.disabled = false;
    }
}

// ============================================
// CHECK: If already logged in, redirect to dashboard
// ============================================
(async function checkSession() {
    try {
        // Try to fetch user data - if session exists, redirect
        // This is a simple check; actual session validation happens in PHP
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'action=login'  // Will fail but we can check if session exists
        });
    } catch (e) {
        // Ignore errors on initial load
    }
})();