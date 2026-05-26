<?php
// ============================================
// AI PREDICTIONS - 100% PHP BASED (No Python Needed)
// Works perfectly on standard XAMPP
// ============================================

require_once 'config.php';
startSecureSession();
header('Content-Type: application/json');

if (!isLoggedIn()) {
    errorResponse('Not authenticated', 401);
}

 $action = $_GET['action'] ?? '';

switch($action) {
    case 'predict':
        getPredictions();
        break;
    case 'analyze':
        analyzeSpending();
        break;
    case 'suggestions':
        getSmartSuggestions();
        break;
    default:
        errorResponse('Invalid action');
}

// ============================================
// FUNCTION: Get Expense Predictions (Pure Math)
// ============================================
function getPredictions() {
    $db = new Database();
    $conn = $db->getConnection();
    $userId = getCurrentUserId();

    try {
        // Get last 30 days of expense transactions
        $stmt = $conn->prepare("
            SELECT transaction_date, amount 
            FROM transactions 
            WHERE user_id = ? 
            AND type = 'expense' 
            AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY transaction_date ASC
        ");
        $stmt->execute([$userId]);
        $transactions = $stmt->fetchAll();

        if (empty($transactions)) {
            successResponse([
                'next_week' => 0,
                'next_month' => 0,
                'daily_average' => 0,
                'trend' => 'stable',
                'confidence' => 'low'
            ]);
            return;
        }

        // Calculate total spent
        $totalSpent = array_sum(array_column($transactions, 'amount'));
        
        // Calculate active days (days you actually spent money)
        $activeDays = count(array_unique(array_column($transactions, 'transaction_date')));
        
        // Safe division to prevent errors
        $dailyAverage = $activeDays > 0 ? $totalSpent / $activeDays : 0;

        // Simple Trend Analysis (Compare first 15 days vs last 15 days)
        $half = ceil(count($transactions) / 2);
        $firstHalf = array_slice($transactions, 0, $half);
        $secondHalf = array_slice($transactions, $half);

        $firstAvg = count($firstHalf) > 0 ? array_sum(array_column($firstHalf, 'amount')) / count($firstHalf) : 0;
        $secondAvg = count($secondHalf) > 0 ? array_sum(array_column($secondHalf, 'amount')) / count($secondHalf) : 0;

        // Determine trend safely
        $diff = $secondAvg - $firstAvg;
        if ($diff > 10) {
            $trend = 'increasing';
        } elseif ($diff < -10) {
            $trend = 'decreasing';
        } else {
            $trend = 'stable';
        }

        // Predictions based on daily average and trend
        $nextWeek = round($dailyAverage * 7, 2);
        $nextMonth = round($dailyAverage * 30, 2);

        if ($trend === 'increasing') {
            $nextWeek = round($nextWeek * 1.1, 2);
            $nextMonth = round($nextMonth * 1.1, 2);
        } elseif ($trend === 'decreasing') {
            $nextWeek = round($nextWeek * 0.9, 2);
            $nextMonth = round($nextMonth * 0.9, 2);
        }

        // Confidence based on data size
        $confidence = count($transactions) >= 20 ? 'high' : (count($transactions) >= 10 ? 'medium' : 'low');

        successResponse([
            'next_week' => $nextWeek,
            'next_month' => $nextMonth,
            'daily_average' => round($dailyAverage, 2),
            'trend' => $trend,
            'confidence' => $confidence
        ]);

    } catch(PDOException $e) {
        errorResponse('Failed to generate predictions');
    }
    $db->close();
}

// ============================================
// FUNCTION: Analyze Spending Patterns
// ============================================
function analyzeSpending() {
    $db = new Database();
    $conn = $db->getConnection();
    $userId = getCurrentUserId();

    try {
        $stmt = $conn->prepare("
            SELECT c.name, c.icon, c.color, 
                   SUM(t.amount) as total,
                   COUNT(t.id) as count
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ? 
            AND t.type = 'expense'
            AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY t.category_id
            ORDER BY total DESC
        ");
        $stmt->execute([$userId]);
        $categoryAnalysis = $stmt->fetchAll();

        $insights = [];
        
        if (!empty($categoryAnalysis)) {
            $totalSpending = array_sum(array_column($categoryAnalysis, 'total'));
            $highest = $categoryAnalysis[0];
            $percentage = round(($highest['total'] / $totalSpending) * 100, 1);
            
            $insights[] = "Your highest spending category is {$highest['name']} ({$percentage}% of total expenses).";
            
            foreach ($categoryAnalysis as $cat) {
                $avg = $cat['total'] / max($cat['count'], 1);
                if ($avg > 100) {
                    $insights[] = "Your average {$cat['name']} expense is $" . number_format($avg, 2) . " - consider setting a budget limit.";
                }
            }
        } else {
            $insights[] = "Start tracking your expenses to get personalized insights!";
        }

        successResponse([
            'category_analysis' => $categoryAnalysis,
            'insights' => $insights
        ]);

    } catch(PDOException $e) {
        errorResponse('Analysis failed');
    }
    $db->close();
}

// ============================================
// FUNCTION: Get Smart Budget Suggestions (50/30/20 Rule)
// ============================================
function getSmartSuggestions() {
    $db = new Database();
    $conn = $db->getConnection();
    $userId = getCurrentUserId();

    try {
        // Get last 30 days income
        $stmt = $conn->prepare("
            SELECT COALESCE(SUM(amount), 0) as total_income
            FROM transactions
            WHERE user_id = ? 
            AND type = 'income'
            AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ");
        $stmt->execute([$userId]);
        $incomeResult = $stmt->fetch();
        $monthlyIncome = $incomeResult['total_income'];

        // Calculate 50/30/20 rule
        $needsBudget = round($monthlyIncome * 0.50, 2);
        $wantsBudget = round($monthlyIncome * 0.30, 2);
        $savingsBudget = round($monthlyIncome * 0.20, 2);

        successResponse([
            'rule_50_30_20' => [
                'needs' => $needsBudget,
                'wants' => $wantsBudget,
                'savings' => $savingsBudget
            ],
            'monthly_income' => $monthlyIncome
        ]);

    } catch(PDOException $e) {
        errorResponse('Failed to generate suggestions');
    }
    $db->close();
}

?>