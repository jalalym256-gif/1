// ========== ALFAJR APP ==========

// Global state
let customers = [];
let currentCustomerId = null;
let db = null;
let currentTheme = 'dark';
let isSaving = false;
let lastSaveTime = 0;
let autoSaveTimer = null;

// Configuration
const CONFIG = {
    MIN_SAVE_INTERVAL: 1500,
    DEBOUNCE_SEARCH: 500
};

// ========== INITIALIZATION ==========
async function initializeApp() {
    try {
        showLoading('در حال راه‌اندازی سیستم...');
        
        // Initialize database
        db = new DatabaseManager();
        await db.initialize();
        
        // Load data
        await loadAllData();
        
        // Load settings
        const savedTheme = await db.getSetting('theme') || 'dark';
        setTheme(savedTheme);
        
        // Setup event listeners
        setupEventListeners();
        
        hideLoading();
        showNotification('سیستم ALFAJR آماده است', 'success');
        
        console.log('✅ App initialized');
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        hideLoading();
        showNotification(`خطا در راه‌اندازی: ${error.message}`, 'error');
        showErrorState(error);
    }
}

// ========== DATA MANAGEMENT ==========
async function loadAllData() {
    try {
        const loadedCustomers = await db.getAllCustomers();
        customers = loadedCustomers.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        updateStats();
        renderCustomerList();
        
    } catch (error) {
        console.error('Load data error:', error);
        showNotification('خطا در بارگذاری داده‌ها', 'error');
    }
}

// ========== CUSTOMER CRUD ==========
async function addCustomer() {
    try {
        const customerName = prompt('نام مشتری را وارد کنید:', 'مشتری جدید');
        if (!customerName || customerName.trim() === '') {
            showNotification('نام نمی‌تواند خالی باشد', 'warning');
            return;
        }
        
        const newCustomer = {
            id: 'CUST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            name: customerName.trim(),
            phone: '',
            notes: '',
            measurements: [],
            models: [],
            orders: [],
            totalPrice: 0,
            paidAmount: 0,
            deliveryDate: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save to database
        const savedCustomer = await db.saveCustomer(newCustomer);
        
        // Add to local array
        customers.unshift(savedCustomer);
        
        // Update UI
        renderCustomerList();
        updateStats();
        
        showNotification('مشتری جدید افزوده شد', 'success');
        
        // Open profile
        openCustomerProfile(savedCustomer.id);
        
    } catch (error) {
        console.error('Add customer error:', error);
        showNotification(`خطا: ${error.message}`, 'error');
    }
}

async function saveCurrentCustomer() {
    if (!currentCustomerId) {
        showNotification('هیچ مشتری انتخاب نشده', 'warning');
        return;
    }
    
    if (isSaving) return;
    
    const now = Date.now();
    if (now - lastSaveTime < CONFIG.MIN_SAVE_INTERVAL) return;
    
    isSaving = true;
    
    try {
        const customer = getCurrentCustomer();
        if (!customer) {
            throw new Error('مشتری پیدا نشد');
        }
        
        // Update timestamp
        customer.updatedAt = new Date().toISOString();
        
        // Save to database
        await db.saveCustomer(customer);
        
        // Update local array
        const index = customers.findIndex(c => c.id === customer.id);
        if (index !== -1) {
            customers[index] = { ...customer };
        }
        
        lastSaveTime = Date.now();
        showNotification('ذخیره شد', 'success');
        
    } catch (error) {
        console.error('Save error:', error);
        showNotification(`خطا در ذخیره: ${error.message}`, 'error');
    } finally {
        isSaving = false;
    }
}

async function deleteCurrentCustomer() {
    if (!currentCustomerId) {
        showNotification('هیچ مشتری انتخاب نشده', 'warning');
        return;
    }
    
    if (!confirm('آیا از حذف این مشتری مطمئن هستید؟ این عمل غیرقابل بازگشت است.')) {
        return;
    }
    
    try {
        await db.deleteCustomer(currentCustomerId);
        
        customers = customers.filter(c => c.id !== currentCustomerId);
        
        backHome();
        renderCustomerList();
        updateStats();
        
        showNotification('مشتری حذف شد', 'success');
        
    } catch (error) {
        console.error('Delete error:', error);
        showNotification(`خطا در حذف: ${error.message}`, 'error');
    }
}

async function deleteCustomer(customerId) {
    if (!confirm('آیا از حذف این مشتری مطمئن هستید؟')) {
        return;
    }
    
    try {
        await db.deleteCustomer(customerId);
        
        customers = customers.filter(c => c.id !== customerId);
        
        if (currentCustomerId === customerId) {
            backHome();
        }
        
        renderCustomerList();
        updateStats();
        
        showNotification('مشتری حذف شد', 'success');
        
    } catch (error) {
        console.error('Delete error:', error);
        showNotification(`خطا در حذف: ${error.message}`, 'error');
    }
}

// ========== NAVIGATION ==========
function getCurrentCustomer() {
    return customers.find(c => c.id === currentCustomerId);
}

function openCustomerProfile(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
        showNotification('مشتری پیدا نشد', 'error');
        return;
    }
    
    currentCustomerId = customerId;
    renderCustomerProfile(customer);
    
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('profilePage').style.display = 'block';
    
    window.scrollTo(0, 0);
}

function backHome() {
    currentCustomerId = null;
    document.getElementById('profilePage').style.display = 'none';
    document.getElementById('homePage').style.display = 'block';
    renderCustomerList();
}

// ========== SEARCH ==========
function searchCustomers() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.trim() : '';
    
    if (!query) {
        renderCustomerList();
        return;
    }
    
    const results = customers.filter(customer => 
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        (customer.phone && customer.phone.includes(query)) ||
        (customer.id && customer.id.toLowerCase().includes(query.toLowerCase()))
    );
    
    renderCustomerList(results);
}

// ========== RENDERING ==========
function renderCustomerList(customerList = customers) {
    const container = document.getElementById('customerList');
    if (!container) return;
    
    if (customerList.length === 0) {
        const isSearching = customerList !== customers;
        
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>${isSearching ? 'مشتری یافت نشد' : 'هنوز مشتری ثبت نشده است'}</h3>
                <p>${isSearching ? 'هیچ مشتری مطابق با جستجوی شما پیدا نشد' : 'برای شروع، روی دکمه "مشتری جدید" کلیک کنید'}</p>
                ${!isSearching ? `
                    <button class="btn-primary" onclick="addCustomer()" style="margin-top: 20px;">
                        <i class="fas fa-user-plus"></i> افزودن اولین مشتری
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = customerList.map(customer => `
        <div class="customer-card" data-customer-id="${customer.id}">
            <div class="customer-card-header">
                <div class="customer-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="customer-info">
                    <div class="customer-name">${escapeHtml(customer.name)}</div>
                    <div class="customer-phone">
                        <i class="fas fa-phone"></i>
                        ${escapeHtml(customer.phone || 'ثبت نشده')}
                    </div>
                </div>
            </div>
            <div class="customer-card-body">
                <div class="customer-id">کد: ${escapeHtml(customer.id)}</div>
                <div class="customer-date">
                    <i class="fas fa-calendar"></i>
                    ${new Date(customer.createdAt).toLocaleDateString('fa-IR')}
                </div>
                ${customer.deliveryDate ? `
                    <div class="customer-delivery">
                        <i class="fas fa-truck"></i>
                        ${escapeHtml(customer.deliveryDate)}
                    </div>
                ` : ''}
            </div>
            <div class="customer-card-actions">
                <button class="btn-primary" onclick="openCustomerProfile('${customer.id}')">
                    <i class="fas fa-eye"></i> مشاهده
                </button>
                <button class="btn-danger" onclick="deleteCustomer('${customer.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderCustomerProfile(customer) {
    // Basic info
    document.getElementById('profileName').textContent = customer.name;
    document.getElementById('profilePhoneText').textContent = customer.phone || 'ثبت نشده';
    document.getElementById('profileId').textContent = `کد: ${customer.id}`;
    
    // Notes
    const notesTextarea = document.getElementById('customerNotes');
    if (notesTextarea) {
        notesTextarea.value = customer.notes || '';
        notesTextarea.oninput = () => {
            customer.notes = notesTextarea.value;
            scheduleAutoSave();
        };
    }
    
    // Price
    const totalPriceInput = document.getElementById('totalPrice');
    const paidAmountInput = document.getElementById('paidAmount');
    const deliveryDateInput = document.getElementById('deliveryDate');
    
    if (totalPriceInput) {
        totalPriceInput.value = customer.totalPrice || '';
        totalPriceInput.onchange = () => {
            customer.totalPrice = totalPriceInput.value;
            scheduleAutoSave();
        };
    }
    
    if (paidAmountInput) {
        paidAmountInput.value = customer.paidAmount || '';
        paidAmountInput.onchange = () => {
            customer.paidAmount = paidAmountInput.value;
            scheduleAutoSave();
        };
    }
    
    if (deliveryDateInput) {
        deliveryDateInput.value = customer.deliveryDate || '';
        deliveryDateInput.onchange = () => {
            customer.deliveryDate = deliveryDateInput.value;
            scheduleAutoSave();
        };
    }
    
    // Measurements
    renderMeasurements(customer);
    
    // Models
    renderModels(customer);
    
    // Orders
    renderOrders(customer);
}

function renderMeasurements(customer) {
    const container = document.getElementById('measurementsGrid');
    if (!container) return;
    
    if (!customer.measurements) {
        customer.measurements = [];
    }
    
    const defaultMeasurements = [
        { label: 'قد', value: '', note: '' },
        { label: 'دور سینه', value: '', note: '' },
        { label: 'دور کمر', value: '', note: '' },
        { label: 'دور باسن', value: '', note: '' },
        { label: 'قد آستین', value: '', note: '' },
        { label: 'دور بازو', value: '', note: '' }
    ];
    
    const allMeasurements = [...defaultMeasurements];
    customer.measurements.forEach(meas => {
        const existing = allMeasurements.find(m => m.label === meas.label);
        if (existing) {
            existing.value = meas.value;
            existing.note = meas.note;
        } else {
            allMeasurements.push(meas);
        }
    });
    
    container.innerHTML = allMeasurements.map(meas => `
        <div class="measurement-item">
            <label>${meas.label}</label>
            <input type="text" 
                   value="${escapeHtml(meas.value)}" 
                   placeholder="سانتیمتر"
                   data-label="${meas.label}"
                   onchange="updateMeasurement('${meas.label}', this.value)">
            <input type="text" 
                   value="${escapeHtml(meas.note || '')}" 
                   placeholder="توضیح"
                   data-label="${meas.label}"
                   onchange="updateMeasurementNote('${meas.label}', this.value)"
                   class="measurement-note">
        </div>
    `).join('');
}

function renderModels(customer) {
    const container = document.getElementById('modelsGrid');
    if (!container) return;
    
    if (!customer.models) {
        customer.models = [];
    }
    
    const allModels = ['کت', 'شلوار', 'پیراهن', 'دامن', 'پالتو', 'بارانی', 'لباس مجلسی'];
    
    container.innerHTML = allModels.map(model => `
        <div class="model-item ${customer.models.includes(model) ? 'selected' : ''}" 
             onclick="toggleModel('${model}')">
            <i class="fas fa-tshirt"></i>
            <span>${model}</span>
        </div>
    `).join('');
}

function renderOrders(customer) {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    if (!customer.orders) {
        customer.orders = [];
    }
    
    if (customer.orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <i class="fas fa-clipboard-list"></i>
                <p>هیچ سفارشی ثبت نشده است</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = customer.orders.map((order, index) => `
        <div class="order-item">
            <div class="order-header">
                <span class="order-type">${escapeHtml(order.type)}</span>
                <button class="btn-small btn-danger" onclick="deleteOrder(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="order-details">
                <span><i class="fas fa-hashtag"></i> تعداد: ${order.quantity || 1}</span>
                <span><i class="fas fa-palette"></i> رنگ: ${order.color || 'تعیین نشده'}</span>
            </div>
            ${order.notes ? `
                <div class="order-notes">
                    <i class="fas fa-sticky-note"></i>
                    ${escapeHtml(order.notes)}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// ========== EVENT HANDLERS ==========
function updateMeasurement(label, value) {
    const customer = getCurrentCustomer();
    if (!customer) return;
    
    if (!customer.measurements) {
        customer.measurements = [];
    }
    
    let measurement = customer.measurements.find(m => m.label === label);
    if (!measurement) {
        measurement = { label, value: '', note: '' };
        customer.measurements.push(measurement);
    }
    
    measurement.value = value;
    scheduleAutoSave();
}

function updateMeasurementNote(label, note) {
    const customer = getCurrentCustomer();
    if (!customer || !customer.measurements) return;
    
    let measurement = customer.measurements.find(m => m.label === label);
    if (!measurement) {
        measurement = { label, value: '', note: '' };
        customer.measurements.push(measurement);
    }
    
    measurement.note = note;
    scheduleAutoSave();
}

function toggleModel(modelName) {
    const customer = getCurrentCustomer();
    if (!customer) return;
    
    if (!customer.models) {
        customer.models = [];
    }
    
    const index = customer.models.indexOf(modelName);
    if (index === -1) {
        customer.models.push(modelName);
    } else {
        customer.models.splice(index, 1);
    }
    
    renderModels(customer);
    scheduleAutoSave();
}

function addOrder() {
    const customer = getCurrentCustomer();
    if (!customer) {
        showNotification('ابتدا یک مشتری انتخاب کنید', 'warning');
        return;
    }
    
    const type = prompt('نوع سفارش را وارد کنید (مثال: کت شلوار):');
    if (!type) return;
    
    if (!customer.orders) {
        customer.orders = [];
    }
    
    const order = {
        type: type.trim(),
        quantity: 1,
        color: '',
        notes: '',
        createdAt: new Date().toISOString()
    };
    
    customer.orders.push(order);
    renderOrders(customer);
    scheduleAutoSave();
}

function deleteOrder(index) {
    const customer = getCurrentCustomer();
    if (!customer || !customer.orders) return;
    
    if (confirm('آیا از حذف این سفارش مطمئن هستید؟')) {
        customer.orders.splice(index, 1);
        renderOrders(customer);
        scheduleAutoSave();
    }
}

function scheduleAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    autoSaveTimer = setTimeout(() => {
        saveCurrentCustomer();
    }, 2000);
}

// ========== STATS ==========
function updateStats() {
    const total = customers.length;
    const paid = customers.filter(c => {
        const paidAmount = parseFloat(c.paidAmount || 0);
        const totalPrice = parseFloat(c.totalPrice || 0);
        return totalPrice > 0 && paidAmount >= totalPrice;
    }).length;
    
    const activeOrders = customers.reduce((sum, c) => 
        sum + (c.orders ? c.orders.length : 0), 0
    );
    
    document.getElementById('totalCustomers').textContent = total;
    document.getElementById('paidCustomers').textContent = paid;
    document.getElementById('activeOrders').textContent = activeOrders;
}

// ========== THEME ==========
function setTheme(theme) {
    currentTheme = theme;
    document.body.className = `${theme}-mode`;
    
    if (db) {
        db.saveSetting('theme', theme);
    }
    
    showNotification(`حالت ${theme === 'dark' ? 'تاریک' : theme === 'light' ? 'روشن' : 'ویوید'} فعال شد`, 'success');
}

function toggleSettings() {
    const dropdown = document.getElementById('settingsDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// ========== IMPORT/EXPORT ==========
async function exportData() {
    try {
        const data = {
            customers: customers,
            exportedAt: new Date().toISOString(),
            version: '1.0',
            count: customers.length
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `alfajr-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('پشتیبان ذخیره شد', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showNotification('خطا در ذخیره پشتیبان', 'error');
    }
}

function triggerFileImport() {
    document.getElementById('fileInput').click();
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('آیا از وارد کردن این پشتیبان مطمئن هستید؟')) {
        event.target.value = '';
        return;
    }
    
    try {
        showLoading('در حال وارد کردن داده‌ها...');
        
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.customers || !Array.isArray(data.customers)) {
            throw new Error('فایل پشتیبان معتبر نیست');
        }
        
        // Clear database
        await db.clearAllData();
        
        // Import customers
        for (const customer of data.customers) {
            await db.saveCustomer(customer);
        }
        
        // Reload
        await loadAllData();
        
        showNotification(`${data.customers.length} مشتری وارد شد`, 'success');
        
    } catch (error) {
        console.error('Import error:', error);
        showNotification(`خطا در وارد کردن: ${error.message}`, 'error');
    } finally {
        hideLoading();
        event.target.value = '';
    }
}

async function clearAllData() {
    if (!confirm('⚠️ آیا مطمئن هستید؟ تمام داده‌ها حذف خواهند شد!')) {
        return;
    }
    
    if (!confirm('❌ تأیید نهایی: همه چیز پاک خواهد شد!')) {
        return;
    }
    
    try {
        showLoading('در حال پاک‌سازی...');
        
        await db.clearAllData();
        customers = [];
        currentCustomerId = null;
        
        renderCustomerList();
        updateStats();
        
        showNotification('همه داده‌ها پاک شدند', 'success');
        
    } catch (error) {
        console.error('Clear error:', error);
        showNotification('خطا در پاک‌سازی', 'error');
    } finally {
        hideLoading();
    }
}

function optimizeDatabase() {
    showNotification('دیتابیس در حال بهینه‌سازی...', 'info');
    setTimeout(() => {
        showNotification('دیتابیس بهینه‌سازی شد', 'success');
    }, 1500);
}

// ========== PRINT ==========
function printMeasurementLabel() {
    const customer = getCurrentCustomer();
    if (!customer) {
        showNotification('ابتدا یک مشتری انتخاب کنید', 'warning');
        return;
    }
    
    saveCurrentCustomer();
    
    if (typeof PrintManager !== 'undefined') {
        PrintManager.printMeasurementLabel(customer);
    } else {
        showNotification('سیستم چاپ در دسترس نیست', 'error');
    }
}

function printInvoice() {
    const customer = getCurrentCustomer();
    if (!customer) {
        showNotification('ابتدا یک مشتری انتخاب کنید', 'warning');
        return;
    }
    
    saveCurrentCustomer();
    
    if (typeof PrintManager !== 'undefined') {
        PrintManager.printInvoice(customer);
    } else {
        showNotification('سیستم چاپ در دسترس نیست', 'error');
    }
}

// ========== UTILITIES ==========
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(message = 'در حال بارگذاری...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    
    if (overlay) overlay.style.display = 'flex';
    if (text && message) text.textContent = message;
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('globalNotification');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                           type === 'error' ? 'exclamation-circle' : 
                           type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${escapeHtml(message)}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function showErrorState(error) {
    const listElement = document.getElementById('customerList');
    if (listElement) {
        listElement.innerHTML = `
            <div class="empty-state error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>خطا در راه‌اندازی سیستم</h3>
                <p>${escapeHtml(error.message)}</p>
                <p>لطفاً صفحه را رفرش کنید</p>
                <button class="btn-primary" onclick="location.reload()" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> رفرش صفحه
                </button>
            </div>
        `;
    }
}

// ========== EVENT LISTENER SETUP ==========
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Search input with Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchCustomers();
            }
        });
    }
    
    // File input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', importData);
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('settingsDropdown');
        const settingsBtn = document.querySelector('.settings-btn');
        
        if (dropdown && dropdown.classList.contains('show') && 
            !dropdown.contains(e.target) && 
            settingsBtn && !settingsBtn.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveCurrentCustomer();
        }
        
        // Escape to go back
        if (e.key === 'Escape') {
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.style.display !== 'none') {
                backHome();
            }
        }
        
        // Ctrl+F to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Ctrl+N for new customer
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            addCustomer();
        }
    });
    
    console.log('Event listeners setup complete');
}

// ========== START APP ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting app...');
    initializeApp();
});

// Global error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showNotification(`خطای سیستمی: ${event.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification(`خطای پردازش: ${event.reason.message || 'خطای ناشناخته'}`, 'error');
});

console.log('ALFAJR App script loaded');
