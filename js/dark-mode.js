// ============================================
// DARK MODE JAVASCRIPT
// Handles toggling and saving dark mode preference
// ============================================

// ============================================
// INITIALIZATION
// Check if user previously enabled dark mode
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Check local storage for dark mode preference
    const isDarkMode = localStorage.getItem('cashflow_darkmode') === 'true';
    
    if (isDarkMode) {
        enableDarkMode(false); // false = don't save again to localStorage
    }
});

// ============================================
// FUNCTION: Toggle Dark Mode On/Off
// ============================================
function toggleDarkMode() {
    const body = document.body;
    
    if (body.classList.contains('dark-mode')) {
        disableDarkMode();
    } else {
        enableDarkMode(true);
    }
}

// ============================================
// FUNCTION: Enable Dark Mode
// ============================================
function enableDarkMode(save = true) {
    document.body.classList.add('dark-mode');
    
    // Change icon to sun (click to turn off)
    const icon = document.getElementById('darkModeIcon');
    if (icon) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
    
    // Save preference
    if (save) {
        localStorage.setItem('cashflow_darkmode', 'true');
    }
}

// ============================================
// FUNCTION: Disable Dark Mode
// ============================================
function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    
    // Change icon to moon (click to turn on)
    const icon = document.getElementById('darkModeIcon');
    if (icon) {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
    
    // Save preference
    localStorage.setItem('cashflow_darkmode', 'false');
}