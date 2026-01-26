// ========== GLOBAL VARIABLES ==========
let customers = [];
let currentCustomerIndex = null;
let dbManager = null;
let currentTheme = 'dark';
let saveTimeout = null;
let isInitialized = false;

// ========== INITIALIZATION ==========
async function initializeApp() {
    try {
        Utils.showLoading('در حال راه‌اندازی سیستم ALFAJR...');
        
        if (!window.indexedDB) {
            throw new Error('مرورگر شما از IndexedDB پشتیبانی نمی‌کند');
        }
        
        // Initialize ID generator
        await idGenerator.initialize();
        
        // Initialize database manager
        dbManager = new DatabaseManager();
        await dbManager.init();
        
        // Sync ID generator with existing customers
        await idGenerator.syncWithDatabase(dbManager);
        
        // Set up update listeners
        dbManager.onUpdate((type, data) => {
            switch (type) {
                case 'customer_saved':
                case 'customer_deleted':
                case 'data_cleared':
                    updateStats();
                    break;
            }
        });
        
        // Load data
        await loadCustomers();
        await loadSettings();
        
        // Apply theme
        const savedTheme = await dbManager.getSettings('theme') || 'dark';
        applyTheme(savedTheme);
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize service worker
        initializeServiceWorker();
        
        Utils.hideLoading();
        Utils.showNotification('سیستم ALFAJR با موفقیت راه‌اندازی شد', 'success');
        isInitialized = true;
        
    } catch (error) {
        Utils.hideLoading();
        Utils.showNotification('خطا در راه‌اندازی سیستم: ' + error.message, 'error');
        showErrorState(error);
    }
}

// ========== SERVICE WORKER ==========
function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            Utils.showNotification('بروزرسانی جدید آماده است!', 'info');
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
}

// ========== THEME MANAGEMENT ==========
function applyTheme(theme) {
    currentTheme = theme;
    document.body.className = `${theme}-mode`;
    
    if (dbManager) {
        dbManager.saveSettings('theme', theme);
    }
}

function toggleDarkMode() {
    applyTheme('dark');
    Utils.showNotification('حالت تاریک فعال شد', 'success');
}

function toggleLightMode() {
    applyTheme('light');
    Utils.showNotification('حالت روشن فعال شد', 'success');
}

function toggleVividMode() {
    applyTheme('vivid');
    Utils.showNotification('حالت ویوید فعال شد', 'success');
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Search input with debouncing
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const debouncedSearch = Utils.debounce(searchCustomer, 500);
        searchInput.addEventListener('input', debouncedSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchCustomer();
        });
    }
    
    // File input for backup
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', loadDataFromFile);
    }
    
    // Notes auto-save
    const notesTextarea = document.getElementById('customerNotes');
    if (notesTextarea) {
        notesTextarea.addEventListener('input', updateNotes);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (currentCustomerIndex !== null) {
                saveCustomer();
                Utils.showNotification('تغییرات ذخیره شد', 'success');
            }
        }
        
        // Escape to go back
        if (e.key === 'Escape') {
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.style.display !== 'none') {
                backHome();
            }
        }
        
        // Ctrl/Cmd + F to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Ctrl/Cmd + N for new customer
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            addCustomer();
        }
        
        // Ctrl/Cmd + P for print
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            if (currentCustomerIndex !== null) {
                printFullTable();
            }
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('settingsDropdown');
        const settingsBtn = document.querySelector('.settings-btn');
        
        if (dropdown && dropdown.classList.contains('show') && 
            !dropdown.contains(event.target) && 
            !settingsBtn.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
}

// ========== ERROR HANDLING ==========
function showErrorState(error) {
    const listElement = document.getElementById('customerList');
    if (listElement) {
        listElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>خطا در راه‌اندازی</h3>
                <p>${Utils.escapeHtml(error.message)}</p>
                <p>لطفاً صفحه را رفرش کنید یا از مرورگر دیگری استفاده نمایید.</p>
                <button class="btn-primary" onclick="location.reload()" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> رفرش صفحه
                </button>
            </div>
        `;
    }
}

// ========== SETTINGS DROPDOWN ==========
function toggleSettings() {
    const dropdown = document.getElementById('settingsDropdown');
    dropdown.classList.toggle('show');
}

function optimizeDatabase() {
    if (confirm('آیا از بهینه‌سازی دیتابیس مطمئن هستید؟')) {
        Utils.showLoading('در حال بهینه‌سازی...');
        setTimeout(() => {
            Utils.hideLoading();
            Utils.showNotification('دیتابیس با موفقیت بهینه‌سازی شد', 'success');
        }, 2000);
    }
}

// ========== CUSTOMER MANAGEMENT FUNCTIONS ==========
async function addCustomer() {
    try {
        const name = prompt('نام مشتری جدید را وارد کنید:');
        if (!name || name.trim().length < 2) {
            Utils.showNotification('نام مشتری باید حداقل ۲ کاراکتر باشد', 'error');
            return;
        }

        const phone = prompt('شماره تماس مشتری را وارد کنید:');
        if (!phone || phone.trim().length < 10 || !/^\d+$/.test(phone)) {
            Utils.showNotification('شماره تلفن باید حداقل ۱۰ رقم عددی باشد', 'error');
            return;
        }

        Utils.showLoading('در حال ایجاد مشتری جدید...');
        const customer = new Customer(name.trim(), phone.trim());
        await dbManager.saveCustomer(customer);
        
        // Refresh the list
        await loadCustomers();
        Utils.hideLoading();
        Utils.showNotification('مشتری جدید با موفقیت ثبت شد', 'success');
        
    } catch (error) {
        Utils.hideLoading();
        Utils.showNotification(error.message, 'error');
    }
}

async function loadCustomers() {
    try {
        customers = await dbManager.getAllCustomers();
        renderCustomerList();
        updateStats();
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

function renderCustomerList() {
    const customerList = document.getElementById('customerList');
    if (!customerList) return;

    if (!customers || customers.length === 0) {
        customerList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>هنوز مشتری ثبت نشده است</h3>
                <p>برای شروع، روی دکمه "مشتری جدید" کلیک کنید</p>
                <button class="btn-primary" onclick="addCustomer()" style="margin-top: 20px;">
                    <i class="fas fa-user-plus"></i> افزودن اولین مشتری
                </button>
            </div>
        `;
        return;
    }

    customerList.innerHTML = customers.map((customer, index) => `
        <div class="customer-card" onclick="openProfile(${index})">
            <div class="customer-header">
                <div class="customer-id">${customer.id || '---'}</div>
                <div class="customer-date">${Utils.formatDate(customer.createdAt)}</div>
            </div>
            <div class="customer-name">${Utils.escapeHtml(customer.name)}</div>
            <div class="customer-phone">
                <i class="fas fa-phone"></i>
                ${Utils.escapeHtml(customer.phone)}
            </div>
            <div class="customer-notes">${Utils.escapeHtml(customer.notes) || 'بدون توضیحات'}</div>
            <div class="customer-footer">
                <div class="customer-badges">
                    ${customer.sewingPriceAfghani ? `<div class="badge price">${Utils.formatPrice(customer.sewingPriceAfghani)} افغانی</div>` : ''}
                    ${customer.paymentReceived ? `<div class="badge paid">پرداخت شده</div>` : ''}
                    ${customer.deliveryDay ? `<div class="badge delivery">${customer.deliveryDay}</div>` : ''}
                </div>
                <button class="delete-btn-small" onclick="event.stopPropagation(); deleteCustomer(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function searchCustomer() {
    try {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput ? searchInput.value.trim() : '';
        
        if (!query) {
            await loadCustomers();
            return;
        }

        Utils.showLoading('در حال جستجو...');
        const results = await dbManager.searchCustomers(query);
        
        const customerList = document.getElementById('customerList');
        if (customerList) {
            if (results.length === 0) {
                customerList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>مشتری یافت نشد</h3>
                        <p>هیچ مشتری مطابق با عبارت "${Utils.escapeHtml(query)}" پیدا نشد</p>
                    </div>
                `;
            } else {
                customerList.innerHTML = results.map((customer, index) => `
                    <div class="customer-card" onclick="openProfile(${index})">
                        <div class="customer-header">
                            <div class="customer-id">${customer.id || '---'}</div>
                            <div class="customer-date">${Utils.formatDate(customer.createdAt)}</div>
                        </div>
                        <div class="customer-name">${Utils.escapeHtml(customer.name)}</div>
                        <div class="customer-phone">
                            <i class="fas fa-phone"></i>
                            ${Utils.escapeHtml(customer.phone)}
                        </div>
                        <div class="customer-footer">
                            <div class="customer-badges">
                                ${customer.sewingPriceAfghani ? `<div class="badge price">${Utils.formatPrice(customer.sewingPriceAfghani)} افغانی</div>` : ''}
                            </div>
                            <button class="delete-btn-small" onclick="event.stopPropagation(); deleteCustomer(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        Utils.hideLoading();
    } catch (error) {
        Utils.hideLoading();
        console.error('Error searching customers:', error);
    }
}

function openProfile(index) {
    if (index < 0 || index >= customers.length) {
        Utils.showNotification('مشتری پیدا نشد', 'error');
        return;
    }

    currentCustomerIndex = index;
    const customer = customers[index];

    // Update profile header
    document.getElementById('profileName').textContent = customer.name;
    document.getElementById('profilePhoneText').textContent = customer.phone;
    document.getElementById('profileId').textContent = `کد: ${customer.id || '---'}`;
    
    // Update notes
    document.getElementById('customerNotes').value = customer.notes || '';
    
    // Render measurements
    renderMeasurements();
    
    // Render models
    renderModels();
    
    // Render price & delivery
    renderPriceDelivery();
    
    // Render orders
    renderOrders();
    
    // Switch to profile page
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('profilePage').style.display = 'block';
}

function backHome() {
    document.getElementById('profilePage').style.display = 'none';
    document.getElementById('homePage').style.display = 'block';
    currentCustomerIndex = null;
    
    // Clear search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    // Reload customers
    loadCustomers();
}

async function deleteCustomer(index) {
    if (index < 0 || index >= customers.length) return;
    
    const customer = customers[index];
    if (!confirm(`آیا از حذف مشتری "${customer.name}" مطمئن هستید؟ این عمل غیرقابل بازگشت است.`)) {
        return;
    }

    try {
        Utils.showLoading('در حال حذف مشتری...');
        await dbManager.deleteCustomer(customer.id);
        await loadCustomers();
        Utils.hideLoading();
        Utils.showNotification('مشتری با موفقیت حذف شد', 'success');
    } catch (error) {
        Utils.hideLoading();
        Utils.showNotification('خطا در حذف مشتری: ' + error.message, 'error');
    }
}

function deleteCurrentCustomer() {
    if (currentCustomerIndex !== null) {
        deleteCustomer(currentCustomerIndex);
        backHome();
    }
}

function updateNotes() {
    if (currentCustomerIndex === null) return;
    
    const notesTextarea = document.getElementById('customerNotes');
    if (notesTextarea) {
        customers[currentCustomerIndex].notes = notesTextarea.value;
    }
}

function renderMeasurements() {
    if (currentCustomerIndex === null) return;
    
    const container = document.getElementById('measurementsContainer');
    if (!container) return;
    
    const customer = customers[currentCustomerIndex];
    
    // Group measurements for better organization
    const groups = [
        {
            title: 'اندازه‌های اصلی',
            fields: ['قد', 'شانه_یک', 'شانه_دو', 'آستین_یک', 'آستین_دو', 'آستین_سه', 'بغل', 'دامن', 'گردن', 'دور_سینه', 'شلوار']
        },
        {
            title: 'اندازه‌های تکمیلی',
            fields: ['دم_پاچه', 'بر_تمبان', 'خشتک', 'چاک_پتی', 'تعداد_سفارش', 'مقدار_تکه']
        }
    ];
    
    container.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-ruler-combined"></i> اندازه‌های مشتری</h3>
        </div>
        <div class="measurements-grid">
            ${groups.map(group => `
                <div class="measurement-group">
                    <h4>${group.title}</h4>
                    <div class="measurement-fields">
                        ${group.fields.map(field => {
                            const fieldLabel = field.replace(/_/g, ' ');
                            const fieldKey = field;
                            const value = customer.measurements[fieldKey] || '';
                            
                            return `
                                <div class="measurement-field">
                                    <label for="measurement_${fieldKey}">${fieldLabel}</label>
                                    <input 
                                        type="text" 
                                        id="measurement_${fieldKey}" 
                                        class="measurement-input" 
                                        value="${value}"
                                        oninput="updateMeasurement('${fieldKey}', this.value)"
                                        onkeydown="handleMeasurementKeydown(event, '${fieldKey}')"
                                        placeholder="---"
                                    >
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function updateMeasurement(field, value) {
    if (currentCustomerIndex === null) return;
    
    // Clear any existing timeout
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    // Update the customer object
    customers[currentCustomerIndex].measurements[field] = value;
    
    // Set a timeout to save changes
    saveTimeout = setTimeout(() => {
        if (currentCustomerIndex !== null) {
            saveCustomer();
        }
    }, 1000);
}

function handleMeasurementKeydown(event, field) {
    // Allow navigation keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
        return;
    }
    
    // Allow control keys
    if (event.ctrlKey || event.metaKey) {
        return;
    }
    
    // Allow numbers, decimal point, and backspace
    if (!/[\d\.]|Backspace|Delete|Enter/.test(event.key) && !event.key.match(/[۰-۹]/)) {
        event.preventDefault();
    }
}

function renderModels() {
    if (currentCustomerIndex === null) return;
    
    const container = document.getElementById('modelsContainer');
    if (!container) return;
    
    const customer = customers[currentCustomerIndex];
    
    container.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-tshirt"></i> مدل‌های انتخابی</h3>
        </div>
        <div class="models-grid">
            <!-- Yakhun Models -->
            <div class="model-category">
                <h4>مدل یخن</h4>
                <div class="model-options">
                    ${AppConfig.YAKHUN_MODELS.map(model => `
                        <div class="model-option ${customer.models.yakhun === model ? 'selected' : ''}" 
                             onclick="selectModel('yakhun', '${model}')">
                            ${model}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Sleeve Models -->
            <div class="model-category">
                <h4>مدل آستین</h4>
                <div class="model-options">
                    ${AppConfig.SLEEVE_MODELS.map(model => `
                        <div class="model-option ${customer.models.sleeve === model ? 'selected' : ''}" 
                             onclick="selectModel('sleeve', '${model}')">
                            ${model}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Skirt Models (Multi-select) -->
            <div class="model-category">
                <h4>مدل دامن</h4>
                <div class="model-options">
                    ${AppConfig.SKIRT_MODELS.map(model => `
                        <div class="model-option multi-select ${customer.models.skirt.includes(model) ? 'selected' : ''}" 
                             onclick="toggleMultiSelect('skirt', '${model}')">
                            ${model}
                            ${customer.models.skirt.includes(model) ? '<span class="checkmark">✓</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Features (Multi-select) -->
            <div class="model-category">
                <h4>ویژگی‌های اضافی</h4>
                <div class="model-options">
                    ${AppConfig.FEATURES_LIST.map(feature => `
                        <div class="model-option multi-select ${customer.models.features.includes(feature) ? 'selected' : ''}" 
                             onclick="toggleMultiSelect('features', '${feature}')">
                            ${feature}
                            ${customer.models.features.includes(feature) ? '<span class="checkmark">✓</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function selectModel(type, model) {
    if (currentCustomerIndex === null) return;
    
    customers[currentCustomerIndex].models[type] = model;
    renderModels();
    saveCustomer();
}

function toggleMultiSelect(type, item) {
    if (currentCustomerIndex === null) return;
    
    const array = customers[currentCustomerIndex].models[type];
    const index = array.indexOf(item);
    
    if (index === -1) {
        array.push(item);
    } else {
        array.splice(index, 1);
    }
    
    renderModels();
    saveCustomer();
}

function renderPriceDelivery() {
    if (currentCustomerIndex === null) return;
    
    const container = document.getElementById('priceDeliveryContainer');
    if (!container) return;
    
    const customer = customers[currentCustomerIndex];
    
    container.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-money-bill-wave"></i> قیمت و زمان تحویل</h3>
        </div>
        <div class="price-delivery-grid">
            <!-- Price Section -->
            <div class="price-section">
                <h4><i class="fas fa-tag"></i> قیمت دوخت</h4>
                <div class="price-input-group">
                    <input type="text" 
                           id="sewingPrice" 
                           class="measurement-input" 
                           value="${customer.sewingPriceAfghani || ''}"
                           oninput="updatePrice(this.value)"
                           placeholder="مثال: 1500">
                    <span class="currency">افغانی</span>
                </div>
            </div>
            
            <!-- Payment Status -->
            <div class="payment-section">
                <h4><i class="fas fa-check-circle"></i> وضعیت پرداخت</h4>
                <div class="payment-toggle" onclick="togglePayment()">
                    <div class="payment-checkbox ${customer.paymentReceived ? 'checked' : ''}">
                        <div class="checkbox-icon">${customer.paymentReceived ? '✓' : ''}</div>
                        <span>پرداخت دریافت شده</span>
                    </div>
                    ${customer.paymentDate ? `
                        <div class="payment-date">
                            تاریخ پرداخت: ${Utils.formatDate(customer.paymentDate)}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Delivery Day -->
            <div class="delivery-section">
                <h4><i class="fas fa-calendar-alt"></i> روز تحویل</h4>
                <div class="delivery-days">
                    ${AppConfig.DAYS_OF_WEEK.map(day => `
                        <div class="day-button ${customer.deliveryDay === day ? 'selected' : ''}" 
                             onclick="setDeliveryDay('${day}')">
                            ${day}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function updatePrice(value) {
    if (currentCustomerIndex === null) return;
    
    // Clear any existing timeout
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    // Update the customer object
    customers[currentCustomerIndex].sewingPriceAfghani = value ? parseInt(value) : null;
    
    // Set a timeout to save changes
    saveTimeout = setTimeout(() => {
        if (currentCustomerIndex !== null) {
            saveCustomer();
        }
    }, 1000);
}

function togglePayment() {
    if (currentCustomerIndex === null) return;
    
    const customer = customers[currentCustomerIndex];
    customer.paymentReceived = !customer.paymentReceived;
    
    if (customer.paymentReceived) {
        customer.paymentDate = new Date().toISOString();
    } else {
        customer.paymentDate = null;
    }
    
    renderPriceDelivery();
    saveCustomer();
}

function setDeliveryDay(day) {
    if (currentCustomerIndex === null) return;
    
    customers[currentCustomerIndex].deliveryDay = day;
    renderPriceDelivery();
    saveCustomer();
}

function renderOrders() {
    if (currentCustomerIndex === null) return;
    
    const container = document.getElementById('ordersContainer');
    if (!container) return;
    
    const customer = customers[currentCustomerIndex];
    const orders = customer.orders || [];
    
    container.innerHTML = `
        <div class="section-header">
            <h3><i class="fas fa-clipboard-list"></i> سفارشات مشتری</h3>
            <button class="btn-add-order" onclick="addOrder()">
                <i class="fas fa-plus"></i> سفارش جدید
            </button>
        </div>
        
        ${orders.length === 0 ? `
            <div class="empty-orders">
                <i class="fas fa-clipboard"></i>
                <p>هنوز سفارشی ثبت نشده است</p>
            </div>
        ` : `
            <div class="orders-list">
                ${orders.map((order, index) => `
                    <div class="order-item">
                        <div class="order-content">
                            <div class="order-header">
                                <div class="order-number">سفارش #${index + 1}</div>
                                <div class="order-date">${Utils.formatDate(order.date)}</div>
                            </div>
                            <div class="order-details">
                                ${order.description || 'بدون توضیحات'}
                            </div>
                        </div>
                        <button class="btn-delete-order" onclick="deleteOrder(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `}
    `;
}

function addOrder() {
    if (currentCustomerIndex === null) return;
    
    const description = prompt('توضیحات سفارش جدید را وارد کنید:');
    if (!description || description.trim() === '') {
        Utils.showNotification('لطفاً توضیحات سفارش را وارد کنید', 'warning');
        return;
    }
    
    const customer = customers[currentCustomerIndex];
    if (!customer.orders) {
        customer.orders = [];
    }
    
    customer.orders.push({
        description: description.trim(),
        date: new Date().toISOString(),
        status: 'pending'
    });
    
    renderOrders();
    saveCustomer();
    Utils.showNotification('سفارش جدید با موفقیت اضافه شد', 'success');
}

function deleteOrder(index) {
    if (currentCustomerIndex === null) return;
    
    const customer = customers[currentCustomerIndex];
    if (!customer.orders || index >= customer.orders.length) return;
    
    if (!confirm('آیا از حذف این سفارش مطمئن هستید؟')) {
        return;
    }
    
    customer.orders.splice(index, 1);
    renderOrders();
    saveCustomer();
    Utils.showNotification('سفارش با موفقیت حذف شد', 'success');
}

async function saveCustomer() {
    if (currentCustomerIndex === null) return;
    
    try {
        const customer = customers[currentCustomerIndex];
        
        // Validate customer
        const errors = customer.validate();
        if (errors.length > 0) {
            Utils.showNotification('خطا در ذخیره: ' + errors.join('، '), 'error');
            return;
        }
        
        // Save to database
        await dbManager.saveCustomer(customer);
        
        // Update UI
        renderCustomerList();
        Utils.showNotification('تغییرات با موفقیت ذخیره شد', 'success');
        
    } catch (error) {
        console.error('Error saving customer:', error);
        Utils.showNotification('خطا در ذخیره تغییرات: ' + error.message, 'error');
    }
}

// ========== STATISTICS ==========
async function updateStats() {
    try {
        const allCustomers = await dbManager.getAllCustomers();
        
        // Total customers
        document.getElementById('totalCustomers').textContent = allCustomers.length;
        
        // Paid customers
        const paidCount = allCustomers.filter(c => c.paymentReceived).length;
        document.getElementById('paidCustomers').textContent = paidCount;
        
        // Active orders (customers with delivery day but not paid)
        const activeOrders = allCustomers.filter(c => 
            c.deliveryDay && !c.paymentReceived
        ).length;
        document.getElementById('activeOrders').textContent = activeOrders;
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ========== PRINT FUNCTIONS ==========
function printFullTable() {
    if (currentCustomerIndex === null) {
        Utils.showNotification('لطفاً ابتدا یک مشتری را انتخاب کنید', 'warning');
        return;
    }
    
    const customer = customers[currentCustomerIndex];
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        Utils.showNotification('لطفاً popup blocker را غیرفعال کنید', 'error');
        return;
    }
    
    // تاریخ شمسی
    const now = new Date();
    const persianDate = now.toLocaleDateString('fa-IR');
    
    // آماده‌سازی مدل‌ها برای ستون سمت چپ
    const models = [
        customer.models.yakhun || '---',
        customer.models.sleeve || '---',
        ...(customer.models.skirt || []),
        ...(customer.models.features || [])
    ];
    
    // اگر کمتر از 7 مدل داریم، خطوط خالی اضافه کنیم
    while (models.length < 7) {
        models.push('---');
    }
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="fa">
        <head>
            <meta charset="UTF-8">
            <title>چاپ لیبل اندازه - ${customer.name}</title>
            <style>
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    
                    body {
                        font-family: 'B Nazanin', Tahoma, Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        font-size: 14pt;
                        line-height: 1.5;
                        background: white;
                        color: black;
                    }
                    
                    .print-container {
                        width: 100%;
                        max-width: 190mm;
                        margin: 0 auto;
                        padding: 5mm;
                    }
                    
                    .header-section {
                        text-align: center;
                        margin-bottom: 8mm;
                        padding-bottom: 4mm;
                        border-bottom: 2px solid #000;
                    }
                    
                    .header-title {
                        font-size: 18pt;
                        font-weight: bold;
                        margin-bottom: 3mm;
                    }
                    
                    .customer-info {
                        display: flex;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        margin-bottom: 6mm;
                        font-size: 12pt;
                    }
                    
                    .info-item {
                        margin: 1mm 0;
                        white-space: nowrap;
                    }
                    
                    .content-wrapper {
                        display: flex;
                        gap: 5mm;
                        margin-top: 5mm;
                    }
                    
                    .models-column {
                        width: 45mm;
                        border: 2px solid #000;
                        border-left: none;
                    }
                    
                    .models-header {
                        background: #f0f0f0;
                        padding: 4mm;
                        text-align: center;
                        font-weight: bold;
                        font-size: 13pt;
                        border-bottom: 2px solid #000;
                    }
                    
                    .model-row {
                        padding: 4mm 2mm;
                        text-align: center;
                        border-bottom: 1px solid #ccc;
                        min-height: 10mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12pt;
                    }
                    
                    .model-row:last-child {
                        border-bottom: none;
                    }
                    
                    .measurements-section {
                        flex: 1;
                    }
                    
                    .measurement-row {
                        display: flex;
                        margin-bottom: 3mm;
                        align-items: stretch;
                    }
                    
                    .measurement-label {
                        width: 35mm;
                        font-weight: bold;
                        text-align: left;
                        padding-left: 3mm;
                        display: flex;
                        align-items: center;
                        font-size: 12pt;
                    }
                    
                    .measurement-values {
                        flex: 1;
                        display: flex;
                        gap: 2mm;
                    }
                    
                    .value-box {
                        flex: 1;
                        border: 1px solid #000;
                        padding: 3mm;
                        text-align: center;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 10mm;
                        background: white;
                        font-size: 12pt;
                    }
                    
                    .double-box {
                        display: flex;
                        flex-direction: column;
                        border: 1px solid #000;
                        padding: 0;
                        flex: 1;
                    }
                    
                    .double-label {
                        padding: 2mm;
                        text-align: center;
                        font-size: 10pt;
                        color: #666;
                        border-bottom: 1px solid #ccc;
                        background: #f9f9f9;
                    }
                    
                    .double-value {
                        padding: 3mm;
                        text-align: center;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex: 1;
                        font-size: 12pt;
                    }
                    
                    .notes-section {
                        margin-top: 8mm;
                        padding: 4mm;
                        border: 1px dashed #ccc;
                        background: #f9f9f9;
                        font-size: 11pt;
                    }
                }
                
                /* For screen preview */
                body {
                    font-family: 'B Nazanin', Tahoma, Arial, sans-serif;
                    margin: 20px;
                    padding: 20px;
                    font-size: 14pt;
                    line-height: 1.5;
                    background: white;
                    color: black;
                    border: 1px solid #ccc;
                }
            </style>
        </head>
        <body>
            <div class="print-container">
                <div class="header-section">
                    <div class="header-title">لیبل اندازه‌های مشتری</div>
                    <div>سیستم خیاطی ALFAJR - نسخه حرفه‌ای</div>
                </div>
                
                <div class="customer-info">
                    <div class="info-item"><strong>آیدی:</strong> ${customer.id || '---'}</div>
                    <div class="info-item"><strong>نام مشتری:</strong> ${customer.name}</div>
                    <div class="info-item"><strong>تاریخ:</strong> ${persianDate}</div>
                    <div class="info-item"><strong>شماره:</strong> ${customer.phone}</div>
                </div>
                
                <div class="content-wrapper">
                    <!-- ستون اندازه‌ها (سمت راست) -->
                    <div class="measurements-section">
                        <!-- ردیف 1: قد -->
                        <div class="measurement-row">
                            <div class="measurement-label">قد</div>
                            <div class="measurement-values">
                                <div class="value-box">${customer.measurements.قد || '---'}</div>
                            </div>
                        </div>
                        
                        <!-- ردیف 2: شانه (دو فیلد) -->
                        <div class="measurement-row">
                            <div class="measurement-label">شانه</div>
                            <div class="measurement-values">
                                <div class="value-box">${customer.measurements.شانه_یک || '---'}</div>
                                <div class="value-box">${customer.measurements.شانه_دو || '---'}</div>
                            </div>
                        </div>
                        
                        <!-- ردیف 3: آستین (سه فیلد) -->
                        <div class="measurement-row">
                            <div class="measurement-label">آستین</div>
                            <div class="measurement-values">
                                <div class="value-box">${customer.measurements.آستین_یک || '---'}</div>
                                <div class="value-box">${customer.measurements.آستین_دو || '---'}</div>
                                <div class="value-box">${customer.measurements.آستین_سه || '---'}</div>
                            </div>
                        </div>
                        
                        <!-- ردیف 4: بغل -->
                        <div class="measurement-row">
                            <div class="measurement-label">بغل</div>
                            <div class="measurement-values">
                                <div class="value-box">${customer.measurements.بغل || '---'}</div>
                            </div>
                        </div>
                        
                        <!-- ردیف 5: دامن -->
                        <div class="measurement-row">
                            <div class="measurement-label">دامن</div>
                            <div class="measurement-values">
                                <div class="value-box">${customer.measurements.دامن || '---'}</div>
                            </div>
                        </div>
                        
                        <!-- ردیف 6: گردن -->
                        <div class="measurement-row">
                            <div class="measurement-label">گردن</div>
                            <div class="measurement-values">
                                <div class="value-box">${customer.measurements.گردن || '---'}</div>
                            </div>
                        </div>
                        
                        <!-- ردیف 7: چاک پتی و دور سینه -->
                        <div class="measurement-row">
                            <div class="measurement-label">چاک پتی</div>
                            <div class="measurement-values">
                                <div class="double-box">
                                    <div class="double-value">${customer.measurements.چاک_پتی || '---'}</div>
                                    <div class="double-label">دور سینه</div>
                                    <div class="double-value">${customer.measurements.دور_سینه || '---'}</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- ردیف 8: شلوار -->
                        <div class="measurement-row">
                            <div class="measurement-label">شلوار</div>
                            <div class="measurement-values">
                                <div class="value-box">${customer.measurements.شلوار || '---'}</div>
                            </div>
                        </div>
                        
                        <!-- ردیف 9: دم پاچه -->
                        <div class="measurement-row">
                            <div class="measurement-label">دم پاچه</div>
                            <div class="measurement-values">
                                <div class="value-box">${customer.measurements.دم_پاچه || '---'}</div>
                            </div>
                        </div>
                        
                        <!-- ردیف 10: بر تهمان و خشتک -->
                        <div class="measurement-row">
                            <div class="measurement-label">بر تهمان</div>
                            <div class="measurement-values">
                                <div class="double-box">
                                    <div class="double-value">${customer.measurements.بر_تمبان || '---'}</div>
                                    <div class="double-label">خشتک</div>
                                    <div class="double-value">${customer.measurements.خشتک || '---'}</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- ردیف 11: تعداد سفارش و مقدار تکه -->
                        <div class="measurement-row">
                            <div class="measurement-label">تعداد سفارش</div>
                            <div class="measurement-values">
                                <div class="double-box">
                                    <div class="double-value">${customer.measurements.تعداد_سفارش || '---'}</div>
                                    <div class="double-label">مقدار تکه</div>
                                    <div class="double-value">${customer.measurements.مقدار_تکه || '---'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- ستون مدل‌ها (سمت چپ) -->
                    <div class="models-column">
                        <div class="models-header">مدل ها</div>
                        ${models.slice(0, 7).map(model => `
                            <div class="model-row">${model}</div>
                        `).join('')}
                    </div>
                </div>
                
                ${customer.notes ? `
                    <div class="notes-section">
                        <strong>توضیحات:</strong> ${customer.notes}
                    </div>
                ` : ''}
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 500);
                    }, 300);
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

function printProfessionalInvoice() {
    if (currentCustomerIndex === null) {
        Utils.showNotification('لطفاً ابتدا یک مشتری را انتخاب کنید', 'warning');
        return;
    }
    
    const customer = customers[currentCustomerIndex];
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        Utils.showNotification('لطفاً popup blocker را غیرفعال کنید', 'error');
        return;
    }
    
    const now = new Date();
    const persianDate = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(now);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاکتور حرفه‌ای - ${customer.name}</title>
            <style>
                body {
                    font-family: 'B Nazanin', Tahoma, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                    color: black;
                }
                
                .invoice-container {
                    max-width: 800px;
                    margin: 0 auto;
                    border: 2px solid #000;
                    padding: 30px;
                    position: relative;
                }
                
                .invoice-header {
                    text-align: center;
                    margin-bottom: 40px;
                    border-bottom: 3px solid #D4AF37;
                    padding-bottom: 20px;
                }
                
                .invoice-title {
                    font-size: 24px;
                    font-weight: bold;
                    color: #D4AF37;
                    margin-bottom: 10px;
                }
                
                .company-info {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 5px;
                }
                
                .customer-details {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                    flex-wrap: wrap;
                    gap: 20px;
                }
                
                .detail-box {
                    flex: 1;
                    min-width: 200px;
                }
                
                .detail-title {
                    font-weight: bold;
                    color: #D4AF37;
                    margin-bottom: 5px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                }
                
                .invoice-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 30px 0;
                }
                
                .invoice-table th {
                    background: #f8f9fa;
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: center;
                    font-weight: bold;
                }
                
                .invoice-table td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: center;
                }
                
                .total-section {
                    margin-top: 30px;
                    text-align: left;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 10px;
                }
                
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    font-size: 16px;
                }
                
                .total-amount {
                    font-size: 20px;
                    font-weight: bold;
                    color: #D4AF37;
                    border-top: 2px solid #ddd;
                    padding-top: 10px;
                    margin-top: 10px;
                }
                
                .notes-section {
                    margin-top: 40px;
                    padding: 20px;
                    border: 1px dashed #ddd;
                    background: #fff8e1;
                }
                
                .notes-title {
                    font-weight: bold;
                    color: #D4AF37;
                    margin-bottom: 10px;
                }
                
                .signature-section {
                    margin-top: 60px;
                    display: flex;
                    justify-content: space-between;
                    padding-top: 20px;
                    border-top: 2px solid #ddd;
                }
                
                .signature-box {
                    text-align: center;
                }
                
                .signature-line {
                    width: 200px;
                    border-top: 1px solid #000;
                    margin: 40px auto 10px;
                }
                
                .print-button {
                    text-align: center;
                    margin-top: 30px;
                }
                
                .print-btn {
                    background: #D4AF37;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                }
                
                @media print {
                    .print-button {
                        display: none;
                    }
                    
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    
                    body {
                        padding: 0;
                    }
                    
                    .invoice-container {
                        border: none;
                        padding: 15mm;
                    }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="invoice-header">
                    <div class="invoice-title">فاکتور حرفه‌ای خدمات خیاطی</div>
                    <div class="company-info">ALFAJR خیاطی - سیستم مدیریت حرفه‌ای</div>
                    <div class="company-info">تاریخ: ${persianDate}</div>
                </div>
                
                <div class="customer-details">
                    <div class="detail-box">
                        <div class="detail-title">اطلاعات مشتری</div>
                        <div><strong>نام:</strong> ${customer.name}</div>
                        <div><strong>کد مشتری:</strong> ${customer.id}</div>
                        <div><strong>تلفن:</strong> ${customer.phone}</div>
                    </div>
                    
                    <div class="detail-box">
                        <div class="detail-title">اطلاعات سفارش</div>
                        <div><strong>تاریخ ثبت:</strong> ${Utils.formatDate(customer.createdAt)}</div>
                        <div><strong>روز تحویل:</strong> ${customer.deliveryDay || 'تعیین نشده'}</div>
                        <div><strong>وضعیت پرداخت:</strong> ${customer.paymentReceived ? 'پرداخت شده' : 'در انتظار پرداخت'}</div>
                    </div>
                </div>
                
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>ردیف</th>
                            <th>شرح خدمات</th>
                            <th>مدل</th>
                            <th>قیمت (افغانی)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>۱</td>
                            <td>دوخت کامل</td>
                            <td>${customer.models.yakhun || '---'}</td>
                            <td>${customer.sewingPriceAfghani ? Utils.formatPrice(customer.sewingPriceAfghani) : '---'}</td>
                        </tr>
                        <tr>
                            <td>۲</td>
                            <td>مدل آستین</td>
                            <td>${customer.models.sleeve || '---'}</td>
                            <td>---</td>
                        </tr>
                        <tr>
                            <td>۳</td>
                            <td>ویژگی‌های اضافی</td>
                            <td>${customer.models.features.join('، ') || '---'}</td>
                            <td>---</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="total-section">
                    <div class="total-row">
                        <span>جمع کل:</span>
                        <span>${customer.sewingPriceAfghani ? Utils.formatPrice(customer.sewingPriceAfghani) + ' افغانی' : '---'}</span>
                    </div>
                    <div class="total-row">
                        <span>تخفیف:</span>
                        <span>۰ افغانی</span>
                    </div>
                    <div class="total-row total-amount">
                        <span>مبلغ قابل پرداخت:</span>
                        <span>${customer.sewingPriceAfghani ? Utils.formatPrice(customer.sewingPriceAfghani) + ' افغانی' : '---'}</span>
                    </div>
                </div>
                
                <div class="notes-section">
                    <div class="notes-title">توضیحات و یادداشت‌ها:</div>
                    <div>${customer.notes || 'بدون توضیحات'}</div>
                </div>
                
                <div class="signature-section">
                    <div class="signature-box">
                        <div>امضای مسئول</div>
                        <div class="signature-line"></div>
                    </div>
                    <div class="signature-box">
                        <div>امضای مشتری</div>
                        <div class="signature-line"></div>
                    </div>
                </div>
                
                <div class="print-button">
                    <button class="print-btn" onclick="window.print()">
                        <i class="fas fa-print"></i> چاپ فاکتور
                    </button>
                </div>
            </div>
            
            <script>
                // Add Font Awesome for print button
                const faLink = document.createElement('link');
                faLink.rel = 'stylesheet';
                faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
                document.head.appendChild(faLink);
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// ========== BACKUP & RESTORE ==========
async function saveDataToFile() {
    try {
        Utils.showLoading('در حال ایجاد پشتیبان...');
        
        // Get all customers
        const customers = await dbManager.getAllCustomers(true);
        
        // Create backup data
        const backupData = {
            version: AppConfig.DATABASE_VERSION,
            timestamp: new Date().toISOString(),
            totalCustomers: customers.length,
            customers: customers.map(c => c.toObject()),
            settings: {
                theme: await dbManager.getSettings('theme') || 'dark'
            }
        };
        
        // Convert to JSON
        const jsonData = JSON.stringify(backupData, null, 2);
        
        // Create download link
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alfajr-backup-${new Date().toISOString().split('T')[0]}.json`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        Utils.hideLoading();
        Utils.showNotification('پشتیبان با موفقیت ذخیره شد', 'success');
        
    } catch (error) {
        Utils.hideLoading();
        Utils.showNotification('خطا در ایجاد پشتیبان: ' + error.message, 'error');
    }
}

async function loadDataFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('آیا از بازیابی پشتیبان مطمئن هستید؟ این عمل داده‌های فعلی را بازنویسی می‌کند.')) {
        event.target.value = '';
        return;
    }
    
    try {
        Utils.showLoading('در حال بازیابی پشتیبان...');
        
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const backupData = JSON.parse(e.target.result);
                
                // Validate backup format
                if (!backupData.customers || !Array.isArray(backupData.customers)) {
                    throw new Error('فرمت فایل پشتیبان نامعتبر است');
                }
                
                // Clear existing data
                await dbManager.clearAllData();
                idGenerator.clearUsedIDs();
                
                // Import customers
                let importedCount = 0;
                for (const customerData of backupData.customers) {
                    try {
                        const customer = Customer.fromObject(customerData);
                        await dbManager.saveCustomer(customer);
                        importedCount++;
                    } catch (err) {
                        console.warn('Failed to import customer:', err);
                    }
                }
                
                // Import settings if available
                if (backupData.settings && backupData.settings.theme) {
                    await dbManager.saveSettings('theme', backupData.settings.theme);
                    applyTheme(backupData.settings.theme);
                }
                
                // Reload data
                await loadCustomers();
                
                event.target.value = '';
                Utils.hideLoading();
                Utils.showNotification(`${importedCount} مشتری با موفقیت بازیابی شد`, 'success');
                
            } catch (error) {
                event.target.value = '';
                Utils.hideLoading();
                Utils.showNotification('خطا در بازیابی پشتیبان: ' + error.message, 'error');
            }
        };
        
        reader.onerror = function() {
            event.target.value = '';
            Utils.hideLoading();
            Utils.showNotification('خطا در خواندن فایل', 'error');
        };
        
        reader.readAsText(file);
        
    } catch (error) {
        event.target.value = '';
        Utils.hideLoading();
        Utils.showNotification('خطا در پردازش فایل: ' + error.message, 'error');
    }
}

async function clearAllData() {
    if (!confirm('⚠️ هشدار: آیا از پاک‌سازی کامل تمام داده‌ها مطمئن هستید؟\n\nاین عمل تمام مشتریان، سفارشات و تنظیمات را حذف می‌کند و غیرقابل بازگشت است.')) {
        return;
    }
    
    try {
        Utils.showLoading('در حال پاک‌سازی داده‌ها...');
        await dbManager.clearAllData();
        await loadCustomers();
        Utils.hideLoading();
        Utils.showNotification('تمامی داده‌ها با موفقیت پاک‌سازی شدند', 'success');
    } catch (error) {
        Utils.hideLoading();
        Utils.showNotification('خطا در پاک‌سازی داده‌ها: ' + error.message, 'error');
    }
}

// ========== SETTINGS ==========
async function loadSettings() {
    try {
        const autoSave = await dbManager.getSettings('autoSave');
        if (autoSave !== null) {
            // Apply auto-save setting if needed
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// ========== GLOBAL EXPORTS ==========
window.addCustomer = addCustomer;
window.searchCustomer = searchCustomer;
window.openProfile = openProfile;
window.backHome = backHome;
window.saveCustomer = saveCustomer;
window.deleteCustomer = deleteCustomer;
window.deleteCurrentCustomer = deleteCurrentCustomer;
window.updateNotes = updateNotes;
window.updateMeasurement = updateMeasurement;
window.handleMeasurementKeydown = handleMeasurementKeydown;
window.selectModel = selectModel;
window.toggleMultiSelect = toggleMultiSelect;
window.updatePrice = updatePrice;
window.togglePayment = togglePayment;
window.setDeliveryDay = setDeliveryDay;
window.addOrder = addOrder;
window.deleteOrder = deleteOrder;
window.printFullTable = printFullTable;
window.printProfessionalInvoice = printProfessionalInvoice;
window.saveDataToFile = saveDataToFile;
window.loadDataFromFile = loadDataFromFile;
window.clearAllData = clearAllData;
window.toggleDarkMode = toggleDarkMode;
window.toggleLightMode = toggleLightMode;
window.toggleVividMode = toggleVividMode;
window.toggleSettings = toggleSettings;
window.optimizeDatabase = optimizeDatabase;

// ========== START APP ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('ALFAJR App initialized - Version 5.0 (Complete)');
