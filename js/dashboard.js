/* ============================================
   KILL DOLLAR SIGN GLOBALLY IN CHARTS
   ============================================ */

if (typeof Chart !== 'undefined') {
    Chart.defaults.scales.linear.ticks.callback = function(value) { return formatCurrency(value); };
    Chart.defaults.plugins.tooltip.callbacks.label = function(context) { return formatCurrency(context.parsed.y !== undefined ? context.parsed.y : context.raw); };
}

/* ============================================
   APP CONFIGURATION
   ============================================ */

var API_URL = 'php-backend/transactions.php';
var AI_URL  = 'php-backend/assignment/ai-predictions.php';

var currentPeriod        = 'daily';
var allTransactionsData  = [];
var categories           = [];
var trendChart           = null;
var categoryChart        = null;
var monthlyChart         = null;
var incomeExpenseChart   = null;
var dayOfWeekChart       = null;
var modalCart            = [];

document.addEventListener('DOMContentLoaded', function() {
    var dateInput = document.getElementById('transactionDate');
    if (dateInput) dateInput.valueAsDate = new Date();
    loadDashboard();
    loadCategories();
});

/* ============================================
   MAIN LOADING FUNCTIONS
   ============================================ */

async function loadDashboard() {
    showLoading(true);
    try {
        await loadSummary();
        await loadTransactions();
        loadAIInsightsSafe();
    } catch (e) {
        console.error('Dashboard Error:', e);
    } finally {
        showLoading(false);
    }
}

async function loadSummary() {
    try {
        var response = await fetch(API_URL + '?action=get_summary&period=' + currentPeriod);
        var data = await response.json();

        if (data.success) {
            var s = data.data || {};
            var totalBalanceEl = document.getElementById('totalBalance');
            var totalIncomeEl  = document.getElementById('totalIncome');
            var totalExpenseEl = document.getElementById('totalExpense');

            if (totalBalanceEl) totalBalanceEl.textContent = formatCurrency(s.balance);
            if (totalIncomeEl)  totalIncomeEl.textContent  = formatCurrency(s.total_income);
            if (totalExpenseEl) totalExpenseEl.textContent = formatCurrency(s.total_expense);

            updateTrendChart(s.category_breakdown || []);
            updateCategoryChart(s.category_breakdown || []);
        }
    } catch (e) {
        console.error('Summary Error:', e);
    }
}

/* ============================================
   PAKISTANI RUPEES FORMATTING
   ============================================ */

function formatCurrency(amount) {
    var value = Number(amount);
    if (isNaN(value)) value = 0;

    var sign     = value < 0 ? '-' : '';
    var absolute = Math.abs(value).toFixed(2);
    var parts    = absolute.split('.');
    var intPart  = parts[0];
    var decPart  = parts[1] || '00';

    var lastThree    = intPart.slice(-3);
    var otherNumbers = intPart.slice(0, -3);
    if (otherNumbers !== '') {
        otherNumbers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',';
    }

    return sign + 'PKR ' + otherNumbers + lastThree + '.' + decPart;
}

/* ============================================
   CATEGORY & TRANSACTION LOADING
   ============================================ */

async function loadCategories() {
    try {
        var response = await fetch(API_URL + '?action=get_categories');
        var data     = await response.json();
        if (data.success) {
            categories = data.data || [];
            updateCategorySelects('expense');
        }
    } catch (e) {
        console.error('Categories Error:', e);
    }
}

async function loadTransactions() {
    try {
        var response = await fetch(API_URL + '?action=get_all&limit=100');
        var data     = await response.json();
        if (data.success) {
            allTransactionsData = data.data || [];
            renderTransactions('recentTransactions', allTransactionsData.slice(0, 10));
            renderTransactions('allTransactions',    allTransactionsData);
        }
    } catch (e) {
        console.error('Transactions Error:', e);
    }
}

/* ============================================
   UI RENDERING
   ============================================ */

function renderTransactions(containerId, transactions) {
    var element = document.getElementById(containerId);
    if (!element) return;

    if (!transactions || transactions.length === 0) {
        element.innerHTML = '<div class="empty-state"><i class="fas fa-ghost"></i><p>Nothing here</p></div>';
        return;
    }

    var html = '';
    for (var i = 0; i < transactions.length; i++) {
        var t       = transactions[i];
        var dateStr = new Date(t.transaction_date + 'T00:00:00').toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
        html += '<div class="transaction-item">' +
            '<div class="t-icon">' + (t.icon || '💸') + '</div>' +
            '<div class="t-details">' +
                '<h4>' + (t.category_name || '-') + '</h4>' +
                '<p>' + (t.description || '-') + '</p>' +
            '</div>' +
            '<div style="flex:1;"></div>' +
            '<div class="t-amount ' + (t.type || '') + '">' +
                (t.type === 'income' ? '+' : '-') + formatCurrency(t.amount) +
                '<div class="t-date">' + dateStr + '</div>' +
            '</div>' +
            '<div class="t-actions">' +
                '<button class="btn-icon" onclick="editTransaction(' + t.id + ')"><i class="fas fa-pen" style="font-size:0.75rem;"></i></button>' +
                '<button class="btn-icon" onclick="deleteTransaction(' + t.id + ')" style="border-color:#FF2D95;"><i class="fas fa-trash" style="font-size:0.75rem;color:#FF2D95;"></i></button>' +
            '</div>' +
        '</div>';
    }

    element.innerHTML = html;
}

/* ============================================
   NAVIGATION & UI INTERACTIONS
   ============================================ */

function changePeriod(period) {
    currentPeriod = period;
    loadSummary();
}

function showSection(sectionName, event) {
    var sections = document.querySelectorAll('main section');
    for (var i = 0; i < sections.length; i++) {
        sections[i].classList.add('hidden');
    }

    var section = document.getElementById('section-' + sectionName);
    if (section) section.classList.remove('hidden');

    var navItems = document.querySelectorAll('.nav-item');
    for (var j = 0; j < navItems.length; j++) {
        navItems[j].classList.remove('active');
    }

    if (event) {
        var item = event.target.closest('.nav-item');
        if (item) item.classList.add('active');
    }

    var pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        var title = sectionName.replace('-', ' ');
        pageTitle.textContent = title.charAt(0).toUpperCase() + title.slice(1);
    }

    if (sectionName === 'analytics')   loadAnalyticsCharts();
    if (sectionName === 'ai-insights') loadAIInsightsSafe();
    if (sectionName === 'budgets')     loadBudgets();

    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
}

function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function showLoading(show) {
    var overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

/* ============================================
   MODAL & MULTI-ITEM LOGIC
   ============================================ */

function addItemToModalList() {
    var nameEl  = document.getElementById('posItemName');
    var qtyEl   = document.getElementById('posItemQty');
    var priceEl = document.getElementById('posItemPrice');

    var name  = nameEl  ? nameEl.value.trim() : '';
    var qty   = parseInt(qtyEl ? qtyEl.value : '1', 10) || 1;
    var price = parseFloat(priceEl ? priceEl.value : '0');

    if (!name) { alert('Enter item name'); return; }
    if (!price || price <= 0) { alert('Enter valid price'); return; }

    modalCart.push({ name: name, qty: qty, price: price });
    renderModalCartList();

    if (nameEl)  nameEl.value  = '';
    if (priceEl) priceEl.value = '';
    if (qtyEl)   qtyEl.value   = 1;
}

function removeItemFromModalList(index) {
    if (index < 0 || index >= modalCart.length) return;
    modalCart.splice(index, 1);
    renderModalCartList();
}

function renderModalCartList() {
    var box         = document.getElementById('modalItemList');
    var amountInput = document.getElementById('transactionAmount');
    if (!box) return;

    if (!modalCart.length) {
        box.classList.remove('show');
        if (amountInput) {
            amountInput.readOnly = false;
            amountInput.value    = '';
        }
        return;
    }

    box.classList.add('show');
    if (amountInput) amountInput.readOnly = true;

    var total = 0;
    var html  = '';
    for (var i = 0; i < modalCart.length; i++) {
        var item      = modalCart[i];
        var itemTotal = item.qty * item.price;
        total += itemTotal;

        html += '<div class="item-row">' +
            '<span>' + item.name + ' (' + item.qty + ' x ' + formatCurrency(item.price) + ')</span>' +
            '<span style="display:flex;align-items:center;gap:8px;">' +
                '<strong>' + formatCurrency(itemTotal) + '</strong>' +
                '<button class="item-row-del" type="button" onclick="removeItemFromModalList(' + i + ')"><i class="fas fa-xmark"></i></button>' +
            '</span>' +
        '</div>';
    }

    box.innerHTML = html;
    if (amountInput) amountInput.value = total.toFixed(2);
}

function openAddModal() {
    var modal = document.getElementById('transactionModal');
    if (!modal) return;

    var titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = 'Add Transaction';

    var form = document.getElementById('transactionForm');
    if (form) form.reset();

    var dateInput = document.getElementById('transactionDate');
    if (dateInput) dateInput.valueAsDate = new Date();

    var qtyInput = document.getElementById('posItemQty');
    if (qtyInput) qtyInput.value = 1;

    modalCart = [];
    renderModalCartList();
    setTransactionType('expense');
    modal.classList.add('show');
}

function closeModal() {
    var modal = document.getElementById('transactionModal');
    if (modal) modal.classList.remove('show');
}

function setTransactionType(type) {
    var typeInput = document.getElementById('transactionType');
    if (typeInput) typeInput.value = type;

    var tabs = document.querySelectorAll('.auth-tab');
    for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        if (!tab) continue;
        var isExpense = tab.textContent.trim().toLowerCase().indexOf('expense') !== -1;
        if (isExpense) {
            tab.style.background = type === 'expense' ? 'white' : 'transparent';
            tab.style.color      = type === 'expense' ? '#FF2D95' : '#A1A1B5';
        } else {
            tab.style.background = type === 'income' ? 'white' : 'transparent';
            tab.style.color      = type === 'income' ? '#16A34A' : '#A1A1B5';
        }
    }

    var posFields = document.getElementById('posFieldsBlock');
    if (posFields) posFields.style.display = type === 'income' ? 'none' : 'block';

    updateCategorySelects(type);
}

async function saveTransaction(event) {
    event.preventDefault();

    var btn = document.getElementById('saveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
        var formData = new FormData();
        var idEl     = document.getElementById('transactionId');
        var typeEl   = document.getElementById('transactionType');
        var amtEl    = document.getElementById('transactionAmount');
        var descEl   = document.getElementById('transactionDescription');
        var dateEl   = document.getElementById('transactionDate');
        var catEl    = document.getElementById('transactionCategory');

        var id   = idEl   ? idEl.value.trim()  : '';
        var type = typeEl ? typeEl.value        : 'expense';
        var amt  = amtEl  ? amtEl.value         : '0';
        var desc = descEl ? descEl.value.trim() : '';

        formData.append('action',      id ? 'edit' : 'add');
        if (id) formData.append('transaction_id', id);
        formData.append('category_id', catEl  ? catEl.value  : '');
        formData.append('type',        type);
        formData.append('amount',      amt);

        if (modalCart.length > 0 && type === 'expense') {
            var itemsStr = modalCart.map(function(item) {
                return item.name + ' (' + item.qty + 'x' + item.price + ')';
            }).join(', ');
            desc = itemsStr + (desc ? ' | ' + desc : '');
        }

        formData.append('description', desc);
        formData.append('date',        dateEl ? dateEl.value : '');

        var response = await fetch(API_URL, { method: 'POST', body: formData });
        var data     = await response.json();

        if (data.success) {
            closeModal();
            loadDashboard();
        } else {
            alert(data.message || 'Unable to save transaction');
        }
    } catch (err) {
        console.error('Save Transaction Error:', err);
        alert('Error saving transaction');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    }
}

async function editTransaction(id) {
    var t = allTransactionsData.find(function(item) { return item.id === id; });
    if (!t) return;

    var titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = 'Edit Transaction';

    var idEl = document.getElementById('transactionId');
    if (idEl) idEl.value = t.id;

    setTransactionType(t.type || 'expense');

    var amtEl  = document.getElementById('transactionAmount');
    var descEl = document.getElementById('transactionDescription');
    var dateEl = document.getElementById('transactionDate');
    var catEl  = document.getElementById('transactionCategory');

    if (amtEl)  amtEl.value  = t.amount;
    if (descEl) descEl.value = t.description || '';
    if (dateEl) dateEl.value = t.transaction_date;
    if (catEl)  catEl.value  = t.category_id || '';

    modalCart = [];
    renderModalCartList();

    var modal = document.getElementById('transactionModal');
    if (modal) modal.classList.add('show');
}

function deleteTransaction(id) {
    var deleteInput = document.getElementById('deleteTransactionId');
    if (deleteInput) deleteInput.value = id;
    var modal = document.getElementById('deleteModal');
    if (modal) modal.classList.add('show');
}

function closeDeleteModal() {
    var modal = document.getElementById('deleteModal');
    if (modal) modal.classList.remove('show');
}

async function confirmDelete() {
    var idEl = document.getElementById('deleteTransactionId');
    var id   = idEl ? idEl.value : '';
    if (!id) return;

    try {
        var formData = new FormData();
        formData.append('action',         'delete');
        formData.append('transaction_id', id);
        await fetch(API_URL, { method: 'POST', body: formData });
        closeDeleteModal();
        loadDashboard();
    } catch (e) {
        console.error('Delete error:', e);
    }
}

/* ============================================
   SEARCH & FILTER
   ============================================ */

var searchTimeout;

function searchTransactions() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(filterTransactions, 300);
}

function filterTransactions() {
    var searchEl = document.getElementById('searchInput');
    var typeEl   = document.getElementById('filterType');
    var search   = searchEl ? searchEl.value.toLowerCase() : '';
    var type     = typeEl   ? typeEl.value                 : '';
    var filtered = allTransactionsData.slice();

    if (search) {
        filtered = filtered.filter(function(t) {
            return (t.description   || '').toLowerCase().includes(search) ||
                   (t.category_name || '').toLowerCase().includes(search);
        });
    }

    if (type) {
        filtered = filtered.filter(function(t) { return t.type === type; });
    }

    renderTransactions('allTransactions', filtered);
}

/* ============================================
   AI INSIGHTS & BUDGETS
   ============================================ */

async function loadAIInsightsSafe() {
    try {
        var response = await fetch(AI_URL + '?action=predict');
        var data     = await response.json();
        if (data.success) {
            var p = data.data || {};
            var elWeek  = document.getElementById('predWeek');
            var elMonth = document.getElementById('predMonth');
            var elDaily = document.getElementById('predDaily');
            var elTrend = document.getElementById('predTrend');

            if (elWeek)  elWeek.textContent  = formatCurrency(p.next_week);
            if (elMonth) elMonth.textContent = formatCurrency(p.next_month);
            if (elDaily) elDaily.textContent = formatCurrency(p.daily_average);
            if (elTrend) {
                var trendStr = (p.trend || '').toString();
                elTrend.textContent = trendStr ? trendStr.charAt(0).toUpperCase() + trendStr.slice(1) : 'Stable';
            }
        }
    } catch (e) {
        console.error('AI Predict Error:', e);
    }

    try {
        var resp2 = await fetch(AI_URL + '?action=suggestions');
        var dat2  = await resp2.json();
        if (dat2.success) {
            var rules = (dat2.data && dat2.data.rule_50_30_20) ? dat2.data.rule_50_30_20 : {};
            var elNeeds   = document.getElementById('budgetNeeds');
            var elWants   = document.getElementById('budgetWants');
            var elSavings = document.getElementById('budgetSavings');

            if (elNeeds)   elNeeds.textContent   = formatCurrency(rules.needs);
            if (elWants)   elWants.textContent   = formatCurrency(rules.wants);
            if (elSavings) elSavings.textContent = formatCurrency(rules.savings);
        }
    } catch (e) {
        console.error('Suggestions Error:', e);
    }
}

function openBudgetModal() {
    updateCategorySelects('expense');
    var budgetAmount = document.getElementById('budgetAmount');
    if (budgetAmount) budgetAmount.value = '';
    var modal = document.getElementById('budgetModal');
    if (modal) modal.classList.add('show');
}

function closeBudgetModal() {
    var modal = document.getElementById('budgetModal');
    if (modal) modal.classList.remove('show');
}

async function saveBudget(event) {
    event.preventDefault();
    try {
        var formData = new FormData();
        var catEl    = document.getElementById('budgetCategory');
        var amtEl    = document.getElementById('budgetAmount');

        formData.append('action',      'add_budget');
        formData.append('category_id', catEl ? catEl.value : '');
        formData.append('amount',      amtEl ? amtEl.value : '0');

        var response = await fetch(API_URL, { method: 'POST', body: formData });
        var data     = await response.json();

        if (data.success) {
            closeBudgetModal();
            loadBudgets();
        } else {
            alert(data.message || 'Unable to save budget');
        }
    } catch (e) {
        console.error('Budget Save Error:', e);
        alert('Error saving budget');
    }
}

async function loadBudgets() {
    try {
        var response  = await fetch(API_URL + '?action=get_budgets');
        var data      = await response.json();
        var container = document.getElementById('budgetList');

        if (data.success && data.data && data.data.length > 0) {
            var html = '';
            for (var i = 0; i < data.data.length; i++) {
                var b       = data.data[i];
                var percent = Math.min((b.spent / b.monthly_limit) * 100, 100).toFixed(0);
                var color   = percent > 90 ? '#FF2D95' : percent > 70 ? '#7C3AED' : '#16A34A';
                html += '<div style="margin-bottom:16px;">' +
                    '<div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:600; margin-bottom:8px;">' +
                        '<strong>' + (b.icon || '') + ' ' + (b.name || '') + '</strong>' +
                        '<span>' + formatCurrency(b.spent) + ' / ' + formatCurrency(b.monthly_limit) + '</span>' +
                    '</div>' +
                    '<div class="budget-progress-bar">' +
                        '<div class="budget-progress-fill" style="background:' + color + '; width:' + percent + '%;"></div>' +
                    '</div>' +
                '</div>';
            }
            if (container) container.innerHTML = html;
        } else if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-bullseye"></i><p>No budgets set</p></div>';
        }
    } catch (e) {
        console.error('Budget Error:', e);
    }
}

function updateCategorySelects(type) {
    var txSelect     = document.getElementById('transactionCategory');
    var budgetSelect = document.getElementById('budgetCategory');

    if (txSelect) {
        txSelect.innerHTML = '<option value="" disabled selected>Select category</option>';
    }
    if (budgetSelect) {
        budgetSelect.innerHTML = '<option value="">Select</option>';
    }

    if (!categories || !categories.length) return;

    var filtered = type
        ? categories.filter(function(cat) { return !cat.type || cat.type === type; })
        : categories;

    if (txSelect) {
        filtered.forEach(function(cat) {
            var opt = document.createElement('option');
            opt.value       = cat.id;
            opt.textContent = cat.name;
            txSelect.appendChild(opt);
        });
    }

    if (budgetSelect) {
        categories.forEach(function(cat) {
            var opt = document.createElement('option');
            opt.value       = cat.id;
            opt.textContent = cat.name;
            budgetSelect.appendChild(opt);
        });
    }
}

/* ============================================
   CHARTS
   ============================================ */

function updateTrendChart() {
    var ctx = document.getElementById('trendChart');
    if (!ctx) return;
    if (trendChart) trendChart.destroy();

    var labels = [];
    var data   = [];

    for (var i = 6; i >= 0; i--) {
        var date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-PK', { weekday: 'short' }));
        var dayStr = date.toDateString();
        var value = allTransactionsData
            .filter(function(t) {
                return t.type === 'expense' &&
                       new Date(t.transaction_date + 'T00:00:00').toDateString() === dayStr;
            })
            .reduce(function(sum, t) { return sum + parseFloat(t.amount || 0); }, 0);
        data.push(value);
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Expense',
                data: data,
                borderColor: '#FF2D95',
                backgroundColor: 'rgba(255,45,149,0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#F3E8FF' }, ticks: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateCategoryChart(catData) {
    var ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    if (categoryChart) categoryChart.destroy();

    if (!catData || !catData.length) {
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['#F3E8FF'] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
        return;
    }

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: catData.map(function(c) { return c.name; }),
            datasets: [{
                data: catData.map(function(c) { return parseFloat(c.total || 0); }),
                backgroundColor: catData.map(function(c) { return c.color || '#7C3AED'; }),
                borderWidth: 3,
                borderColor: '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            cutout: '70%'
        }
    });
}

/* ============================================
   ANALYTICS CHARTS
   ============================================ */

async function loadAnalyticsCharts() {
    var mCtx = document.getElementById('monthlyChart');
    if (!mCtx) return;
    if (monthlyChart) monthlyChart.destroy();

    var months      = [];
    var incomeData  = [];
    var expenseData = [];

    for (var i = 5; i >= 0; i--) {
        var d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push(d.toLocaleDateString('en-PK', { month: 'short' }));

        var monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
        var monthEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

        incomeData.push(
            allTransactionsData
                .filter(function(t) { return t.type === 'income' && t.transaction_date >= monthStart && t.transaction_date <= monthEnd; })
                .reduce(function(sum, t) { return sum + parseFloat(t.amount || 0); }, 0)
        );
        expenseData.push(
            allTransactionsData
                .filter(function(t) { return t.type === 'expense' && t.transaction_date >= monthStart && t.transaction_date <= monthEnd; })
                .reduce(function(sum, t) { return sum + parseFloat(t.amount || 0); }, 0)
        );
    }

    monthlyChart = new Chart(mCtx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Income',   data: incomeData,  backgroundColor: '#16A34A', borderRadius: 8 },
                { label: 'Expenses', data: expenseData, backgroundColor: '#FF2D95', borderRadius: 8 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#F3E8FF' } },
                x: { grid: { display: false } }
            }
        }
    });

    /* Income vs Expense doughnut */
    var iCtx = document.getElementById('incomeExpenseChart');
    if (iCtx) {
        if (incomeExpenseChart) incomeExpenseChart.destroy();

        var totalIncome  = allTransactionsData.filter(function(t) { return t.type === 'income';  }).reduce(function(s, t) { return s + parseFloat(t.amount || 0); }, 0);
        var totalExpense = allTransactionsData.filter(function(t) { return t.type === 'expense'; }).reduce(function(s, t) { return s + parseFloat(t.amount || 0); }, 0);

        incomeExpenseChart = new Chart(iCtx, {
            type: 'doughnut',
            data: {
                labels: ['Income', 'Expenses'],
                datasets: [{
                    data: [totalIncome, totalExpense],
                    backgroundColor: ['#16A34A', '#FF2D95'],
                    borderWidth: 3,
                    borderColor: '#FFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                cutout: '70%'
            }
        });
    }

    /* Spending by day of week */
    var dCtx = document.getElementById('dayOfWeekChart');
    if (dCtx) {
        if (dayOfWeekChart) dayOfWeekChart.destroy();

        var dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        var fullDays  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        var dayData   = fullDays.map(function(fullDay) {
            return allTransactionsData
                .filter(function(t) {
                    return t.type === 'expense' &&
                           new Date(t.transaction_date + 'T00:00:00').toLocaleDateString('en-PK', { weekday: 'long' }) === fullDay;
                })
                .reduce(function(sum, t) { return sum + parseFloat(t.amount || 0); }, 0);
        });

        dayOfWeekChart = new Chart(dCtx, {
            type: 'bar',
            data: {
                labels: dayLabels,
                datasets: [{
                    data: dayData,
                    backgroundColor: '#E0C3FC',
                    borderRadius: 12,
                    borderColor: '#7C3AED',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#F3E8FF' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

/* ============================================
   DARK MODE TOGGLE (fallback if dark-mode.js absent)
   ============================================ */

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    var icon = document.getElementById('darkModeIcon');
    if (icon) {
        icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
    }
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? '1' : '0');
}

(function() {
    if (localStorage.getItem('darkMode') === '1') {
        document.body.classList.add('dark-mode');
        var icon = document.getElementById('darkModeIcon');
        if (icon) icon.className = 'fas fa-sun';
    }
})();

/* ============================================
   LOGOUT
   ============================================ */

async function handleLogout() {
    if (!confirm('Logout?')) return;
    try {
        await fetch('php-backend/auth.php', { method: 'POST', body: new URLSearchParams('action=logout') });
    } catch (e) {
        console.warn('Logout failed', e);
    }
    window.location.href = 'index.html';
}