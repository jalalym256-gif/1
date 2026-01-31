// ========== ALFAJR TAILORING MANAGEMENT SYSTEM ==========
// Version: 5.0 - Professional Complete Edition
// Author: ALFAJR Team
// Last Updated: 2024

// ========== CONFIGURATION ==========
const AppConfig = {
    DATABASE_NAME: 'ALFAJR_DB_V5',
    DATABASE_VERSION: 5,
    
    MEASUREMENT_FIELDS: [
        "قد", "شانه_یک", "شانه_دو", "آستین_یک", "آستین_دو", "آستین_سه",
        "بغل", "دامن", "گردن", "دور_سینه", "شلوار", "دم_پاچه",
        "بر_تمبان", "خشتک", "چاک_پتی", "تعداد_سفارش", "مقدار_تکه"
    ],
    
    YAKHUN_MODELS: ["آف دار", "چپه یخن", "پاکستانی", "ملی", "شهبازی", "خامک", "قاسمی"],
    SLEEVE_MODELS: ["کفک", "ساده شیش بخیه", "بندک", "پر بخیه", "آف دار", "لایی یک انچ"],
    SKIRT_MODELS: ["دامن یک بخیه", "دامن دوبخیه", "دامن چهارکنج", "دامن ترخیز", "دامن گاوی"],
    FEATURES_LIST: ["جیب رو", "جیب شلوار", "یک بخیه سند", "دو بخیه سند", "مکمل دو بخیه"],
    DAYS_OF_WEEK: ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"],
    
    DEFAULT_SETTINGS: {
        theme: 'dark',
        printFormat: 'thermal',
        currency: 'افغانی',
        autoSave: true,
        backupInterval: 24
    }
};

// ========== GLOBAL VARIABLES ==========
let customers = [];
let currentCustomerIndex = null;
let dbManager = null;
let currentTheme = 'dark';
let saveTimeout = null;
let isInitialized = false;

// ========== UTILITY FUNCTIONS ==========
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatPrice(price) {
    if (!price && price !== 0) return '۰';
    return new Intl.NumberFormat('fa-IR').format(price);
}

function showNotification(message, type = 'info', duration = 4000) {
    // حذف نوتیفیکیشن قبلی
    const existing = document.getElementById('globalNotification');
    if (existing) {
        existing.remove();
    }
    
    // ایجاد نوتیفیکیشن جدید
    const notification = document.createElement('div');
    notification.id = 'globalNotification';
    notification.className = `notification ${type}`;
    
    // استایل‌ها
    Object.assign(notification.style, {
        position: 'fixed',
        top: '30px',
        right: '30px',
        padding: '20px 30px',
        borderRadius: '12px',
        color: 'white',
        fontWeight: '600',
        zIndex: '10000',
        maxWidth: '500px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        fontSize: '15px',
        transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        backdropFilter: 'blur(10px)',
        borderLeft: '5px solid',
        opacity: '0',
        transform: 'translateX(100px)'
    });
    
    // رنگ‌ها
    const colors = {
        success: { bg: '#28a745', border: '#28a745' },
        error: { bg: '#dc3545', border: '#dc3545' },
        warning: { bg: '#ffc107', border: '#ffc107', text: '#333' },
        info: { bg: '#17a2b8', border: '#17a2b8' }
    };
    
    const color = colors[type] || colors.info;
    notification.style.backgroundColor = color.bg;
    notification.style.borderLeftColor = color.border;
    if (color.text) {
        notification.style.color = color.text;
    }
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <span style="font-size: 20px; font-weight: bold;">${icons[type] || 'ℹ️'}</span>
        <span>${escapeHtml(message)}</span>
    `;
    
    document.body.appendChild(notification);
    
    // نمایش با انیمیشن
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // حذف خودکار
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, duration);
}

function showLoading(message = 'در حال بارگذاری...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.92);
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-family: Tahoma, Arial, sans-serif;
            backdrop-filter: blur(10px);
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 70px;
            height: 70px;
            border: 5px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top-color: #D4AF37;
            animation: spin 1s linear infinite;
            margin-bottom: 30px;
        `;

        const text = document.createElement('div');
        text.id = 'loadingText';
        text.style.cssText = `
            font-size: 18px;
            text-align: center;
            max-width: 400px;
            line-height: 1.8;
            color: #D4AF37;
        `;
        text.textContent = message;

        // اضافه کردن animation
        if (!document.getElementById('spinAnimation')) {
            const style = document.createElement('style');
            style.id = 'spinAnimation';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        overlay.appendChild(spinner);
        overlay.appendChild(text);
        document.body.appendChild(overlay);
    }
    
    overlay.style.display = 'flex';
    document.getElementById('loadingText').textContent = message;
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// ========== CUSTOMER CLASS ==========
class Customer {
    constructor(name, phone) {
        this.id = this.generateNumericId();
        this.name = name || '';
        this.phone = phone || '';
        this.notes = '';
        this.measurements = this.createEmptyMeasurements();
        this.models = {
            yakhun: '',
            sleeve: '',
            skirt: [],
            features: []
        };
        this.sewingPriceAfghani = null;
        this.deliveryDay = '';
        this.paymentReceived = false;
        this.paymentDate = null;
        this.orders = [];
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        this.deleted = false;
        this.version = 1;
    }

    generateNumericId() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(1000 + Math.random() * 9000);
        return parseInt(timestamp + random).toString().slice(0, 4);
    }

    createEmptyMeasurements() {
        const measurements = {};
        AppConfig.MEASUREMENT_FIELDS.forEach(field => {
            measurements[field] = '';
        });
        return measurements;
    }

    validate() {
        const errors = [];
        
        if (!this.name || this.name.trim().length < 2) {
            errors.push('نام مشتری باید حداقل ۲ کاراکتر باشد');
        }
        
        if (!this.phone || this.phone.trim().length < 10 || !/^\d+$/.test(this.phone)) {
            errors.push('شماره تلفن باید حداقل ۱۰ رقم عددی باشد');
        }
        
        return errors;
    }

    toObject() {
        return {
            id: this.id,
            name: this.name,
            phone: this.phone,
            notes: this.notes,
            measurements: this.measurements,
            models: this.models,
            sewingPriceAfghani: this.sewingPriceAfghani,
            deliveryDay: this.deliveryDay,
            paymentReceived: this.paymentReceived,
            paymentDate: this.paymentDate,
            orders: this.orders,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            deleted: this.deleted,
            version: this.version
        };
    }

    static fromObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return new Customer('', '');
        }
        
        const customer = new Customer(obj.name || '', obj.phone || '');
        
        Object.keys(obj).forEach(key => {
            if (key !== 'id' && key !== 'name' && key !== 'phone') {
                try {
                    customer[key] = obj[key];
                } catch (e) {}
            }
        });
        
        return customer;
    }
}

// ========== DATABASE MANAGER ==========
class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    async init() {
        return new Promise((resolve, reject) => {
            if (this.isInitialized && this.db) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(AppConfig.DATABASE_NAME, AppConfig.DATABASE_VERSION);
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                
                this.db.onerror = (event) => {
                    showNotification('خطا در پایگاه داده', 'error');
                };
                
                this.updateDatabaseStatus(true);
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('customers')) {
                    const store = db.createObjectStore('customers', { keyPath: 'id' });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('phone', 'phone', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    updateDatabaseStatus(connected) {
        const statusElement = document.getElementById('dbStatus');
        if (statusElement) {
            if (connected) {
                statusElement.innerHTML = '<i class="fas fa-database"></i> <span>متصل</span>';
                statusElement.className = 'db-status connected';
            } else {
                statusElement.innerHTML = '<i class="fas fa-database"></i> <span>قطع</span>';
                statusElement.className = 'db-status disconnected';
            }
        }
    }

    async saveCustomer(customer) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized || !this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const errors = customer.validate();
            if (errors.length > 0) {
                reject(new Error(errors.join('\n')));
                return;
            }
            
            customer.updatedAt = new Date().toISOString();
            const customerData = customer.toObject();
            
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const store = transaction.objectStore('customers');
            
            const request = store.put(customerData);
            
            request.onsuccess = () => {
                resolve(customer);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getAllCustomers(includeDeleted = false) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized || !this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction(['customers'], 'readonly');
            const store = transaction.objectStore('customers');
            const request = store.getAll();
            
            request.onsuccess = () => {
                let customers = request.result || [];
                
                if (!includeDeleted) {
                    customers = customers.filter(c => !c.deleted);
                }
                
                const customerObjects = customers.map(c => Customer.fromObject(c));
                customerObjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                
                resolve(customerObjects);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async getCustomer(id) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized || !this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction(['customers'], 'readonly');
            const store = transaction.objectStore('customers');
            const request = store.get(id);
            
            request.onsuccess = () => {
                if (request.result) {
                    resolve(Customer.fromObject(request.result));
                } else {
                    resolve(null);
                }
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async deleteCustomer(id) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized || !this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const store = transaction.objectStore('customers');
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const customer = getRequest.result;
                if (customer) {
                    customer.deleted = true;
                    customer.updatedAt = new Date().toISOString();
                    
                    const putRequest = store.put(customer);
                    putRequest.onsuccess = () => {
                        resolve(true);
                    };
                    putRequest.onerror = (event) => reject(event.target.error);
                } else {
                    reject(new Error('Customer not found'));
                }
            };
            
            getRequest.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async searchCustomers(query) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized || !this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            if (!query || query.trim() === '') {
                resolve([]);
                return;
            }
            
            const transaction = this.db.transaction(['customers'], 'readonly');
            const store = transaction.objectStore('customers');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const allCustomers = request.result || [];
                const searchTerm = query.toLowerCase().trim();
                
                const results = allCustomers.filter(customer => {
                    if (customer.deleted) return false;
                    
                    const searchFields = [
                        customer.name,
                        customer.phone,
                        customer.notes,
                        customer.id,
                        customer.models?.yakhun,
                        customer.deliveryDay
                    ];
                    
                    return searchFields.some(field => 
                        field && field.toString().toLowerCase().includes(searchTerm)
                    );
                }).map(c => Customer.fromObject(c));
                
                resolve(results);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
}

// ========== INITIALIZATION ==========
async function initializeApp() {
    try {
        showLoading('در حال راه‌اندازی سیستم ALFAJR...');
        
        if (!window.indexedDB) {
            throw new Error('مرورگر شما از IndexedDB پشتیبانی نمی‌کند');
        }
        
        // ایجاد مدیر دیتابیس
        dbManager = new DatabaseManager();
        await dbManager.init();
        
        // بارگذاری مشتریان
        await loadCustomers();
        
        // تنظیم event listeners
        setupEventListeners();
        
        hideLoading();
        showNotification('سیستم ALFAJR با موفقیت راه‌اندازی شد', 'success');
        isInitialized = true;
        
    } catch (error) {
        hideLoading();
        showNotification('خطا در راه‌اندازی سیستم: ' + error.message, 'error');
        
        const listElement = document.getElementById('customerList');
        if (listElement) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>خطا در راه‌اندازی</h3>
                    <p>${escapeHtml(error.message)}</p>
                    <button class="btn-primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> رفرش صفحه
                    </button>
                </div>
            `;
        }
    }
}

function setupEventListeners() {
    // جستجو با Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCustomer();
            }
        });
    }
    
    // کلیدهای میانبر
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            addCustomer();
        }
        
        if (e.key === 'Escape') {
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.style.display !== 'none') {
                backHome();
            }
        }
    });
}

// ========== CUSTOMER MANAGEMENT ==========
async function addCustomer() {
    const name = prompt('نام کامل مشتری را وارد کنید:');
    if (!name || name.trim() === '') {
        showNotification('نام مشتری الزامی است', 'warning');
        return;
    }

    const phone = prompt('شماره تلفن مشتری را وارد کنید:');
    if (!phone || phone.trim() === '' || !/^\d+$/.test(phone)) {
        showNotification('شماره تلفن باید عددی و حداقل ۱۰ رقم باشد', 'warning');
        return;
    }

    try {
        showLoading('در حال اضافه کردن مشتری جدید...');
        const customer = new Customer(name.trim(), phone.trim());
        await dbManager.saveCustomer(customer);
        
        await loadCustomers();
        
        hideLoading();
        showNotification(`مشتری "${name}" با موفقیت اضافه شد`, 'success');
    } catch (error) {
        hideLoading();
        showNotification('خطا در اضافه کردن مشتری: ' + error.message, 'error');
    }
}

async function loadCustomers() {
    try {
        customers = await dbManager.getAllCustomers();
        renderCustomerList();
        updateStats();
    } catch (error) {
        showNotification('خطا در بارگذاری مشتریان', 'error');
        renderCustomerList();
    }
}

function renderCustomerList() {
    const listElement = document.getElementById('customerList');
    if (!listElement) return;

    if (!customers || customers.length === 0) {
        listElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>هنوز مشتری ثبت نشده است</h3>
                <p>برای شروع، روی دکمه "مشتری جدید" کلیک کنید</p>
                <button class="btn-primary" onclick="addCustomer()">
                    <i class="fas fa-user-plus"></i> افزودن اولین مشتری
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    customers.forEach((customer, index) => {
        const hasPrice = customer.sewingPriceAfghani && customer.sewingPriceAfghani > 0;
        const isPaid = customer.paymentReceived;
        const deliveryDay = customer.deliveryDay;
        const date = new Date(customer.createdAt);
        const formattedDate = date.toLocaleDateString('fa-IR');
        const hasNotes = customer.notes && customer.notes.trim().length > 0;
        
        html += `
            <div class="customer-card" onclick="openProfile(${index})">
                <div class="customer-header">
                    <span class="customer-id">${escapeHtml(customer.id)}</span>
                    <span class="customer-date">${escapeHtml(formattedDate)}</span>
                </div>
                <div class="customer-name">${escapeHtml(customer.name || 'بدون نام')}</div>
                <div class="customer-phone">
                    <i class="fas fa-phone"></i>
                    ${escapeHtml(customer.phone || 'بدون شماره')}
                </div>
                ${hasNotes ? `
                    <div class="customer-notes">
                        <i class="fas fa-sticky-note"></i>
                        ${escapeHtml(customer.notes.substring(0, 80))}${customer.notes.length > 80 ? '...' : ''}
                    </div>
                ` : ''}
                <div class="customer-footer">
                    <div class="customer-badges">
                        ${hasPrice ? `<span class="badge price">${formatPrice(customer.sewingPriceAfghani)} افغانی</span>` : ''}
                        ${isPaid ? '<span class="badge paid">پرداخت شده</span>' : ''}
                        ${deliveryDay ? `<span class="badge delivery">${escapeHtml(deliveryDay)}</span>` : ''}
                    </div>
                    <button class="delete-btn-small" onclick="event.stopPropagation(); deleteCustomer('${customer.id}', ${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    listElement.innerHTML = html;
}

async function searchCustomer() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (!query) {
        await loadCustomers();
        return;
    }

    try {
        const results = await dbManager.searchCustomers(query);
        
        const listElement = document.getElementById('customerList');
        if (!listElement) return;

        if (results.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>مشتری یافت نشد</h3>
                    <p>هیچ مشتری با مشخصات "${escapeHtml(query)}" پیدا نشد</p>
                </div>
            `;
            return;
        }

        let html = '';
        results.forEach((customer, index) => {
            const realIndex = customers.findIndex(c => c.id === customer.id);
            const hasPrice = customer.sewingPriceAfghani && customer.sewingPriceAfghani > 0;
            const isPaid = customer.paymentReceived;
            const deliveryDay = customer.deliveryDay;
            
            html += `
                <div class="customer-card search-result" onclick="openProfile(${realIndex})">
                    <div class="search-badge">
                        <i class="fas fa-search"></i> نتیجه جستجو
                    </div>
                    <div class="customer-name">${escapeHtml(customer.name || 'بدون نام')}</div>
                    <div class="customer-phone">
                        <i class="fas fa-phone"></i>
                        ${escapeHtml(customer.phone || 'بدون شماره')}
                    </div>
                    <div class="customer-footer">
                        <div class="customer-badges">
                            ${hasPrice ? `<span class="badge price">${formatPrice(customer.sewingPriceAfghani)} افغانی</span>` : ''}
                            ${isPaid ? '<span class="badge paid">پرداخت شده</span>' : ''}
                            ${deliveryDay ? `<span class="badge delivery">${escapeHtml(deliveryDay)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        listElement.innerHTML = html;
        showNotification(`${results.length} مشتری یافت شد`, 'success');
    } catch (error) {
        showNotification('خطا در جستجو', 'error');
    }
}

async function deleteCustomer(id, index) {
    if (!id) return;
    
    const customer = customers.find(c => c.id === id);
    if (!customer) return;
    
    const customerName = customer.name || 'این مشتری';
    if (!confirm(`آیا از حذف "${customerName}" مطمئن هستید؟\nاین عمل قابل بازگشت نیست.`)) return;
    
    try {
        showLoading('در حال حذف مشتری...');
        await dbManager.deleteCustomer(id);
        await loadCustomers();
        
        if (document.getElementById('profilePage').style.display !== 'none') {
            backHome();
        }
        
        hideLoading();
        showNotification('مشتری با موفقیت حذف شد', 'success');
    } catch (error) {
        hideLoading();
        showNotification('خطا در حذف مشتری', 'error');
    }
}

function deleteCurrentCustomer() {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;
    deleteCustomer(customer.id, currentCustomerIndex);
}

// ========== PROFILE MANAGEMENT ==========
function openProfile(index) {
    if (index < 0 || index >= customers.length) {
        showNotification('مشتری یافت نشد', 'error');
        return;
    }

    currentCustomerIndex = index;
    const customer = customers[index];

    document.getElementById('profileName').textContent = customer.name || 'بدون نام';
    document.getElementById('profilePhoneText').textContent = customer.phone || 'بدون شماره';
    document.getElementById('profileId').textContent = `کد: ${customer.id}`;
    
    const notesElement = document.getElementById('customerNotes');
    if (notesElement) {
        notesElement.value = customer.notes || '';
    }

    // نمایش صفحه پروفایل
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('profilePage').style.display = 'block';

    // اضافه کردن دکمه‌های چاپ
    addPrintButtons();
    
    // اسکرول به بالا
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backHome() {
    document.getElementById('homePage').style.display = 'block';
    document.getElementById('profilePage').style.display = 'none';
    currentCustomerIndex = null;
    loadCustomers();
}

function addPrintButtons() {
    const printContainer = document.getElementById('printButtonsContainer');
    if (printContainer) {
        printContainer.innerHTML = `
            <button class="btn-primary" onclick="printFullTable()">
                <i class="fas fa-print"></i>
                چاپ لیبل اندازه
            </button>
            <button class="btn-secondary" onclick="printProfessionalInvoice()">
                <i class="fas fa-file-invoice"></i>
                چاپ فاکتور
            </button>
        `;
    }
}

// ========== STATISTICS ==========
function updateStats() {
    try {
        const totalCustomers = customers.length;
        const totalOrders = customers.reduce((sum, customer) => sum + (customer.orders ? customer.orders.length : 0), 0);
        const paidCustomers = customers.filter(c => c.paymentReceived).length;
        
        document.getElementById('totalCustomers').textContent = totalCustomers;
        document.getElementById('activeOrders').textContent = totalOrders;
        document.getElementById('paidCustomers').textContent = paidCustomers;
        
    } catch (error) {
        // خطا در آمارگیری مهم نیست
    }
}

// ========== PRINT FUNCTIONS ==========
function printFullTable() {
    if (currentCustomerIndex === null) {
        showNotification('لطفاً ابتدا یک مشتری انتخاب کنید', 'warning');
        return;
    }

    const customer = customers[currentCustomerIndex];
    const today = new Date();
    const persianDate = today.toLocaleDateString('fa-IR');
    const time = today.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    
    const printContent = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <title>لیبل اندازه‌گیری ALFAJR</title>
    <style>
        body { 
            width: 72mm; 
            padding: 5mm; 
            font-family: Tahoma, Arial, sans-serif; 
            font-size: 13px; 
            margin: 0 auto;
            background: white;
            color: black;
            line-height: 1.5;
        }
        .header {
            text-align: center;
            padding: 2mm 0;
            border-bottom: 1px solid #000;
            margin-bottom: 2mm;
        }
        .customer-info {
            text-align: center;
            margin: 2mm 0;
            padding: 2mm;
        }
        .customer-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 1mm;
        }
        .footer {
            text-align: center;
            margin-top: 2mm;
            padding-top: 1mm;
            border-top: 0.5px solid #ccc;
            font-size: 10px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="font-size: 16px; font-weight: bold;">ALFAJR خیاطی</div>
        <div style="font-size: 12px;">۰۷۹۹۷۹۹۰۰۹</div>
    </div>
    
    <div class="customer-info">
        <div class="customer-name">${escapeHtml(customer.name || 'بدون نام')}</div>
        <div>${escapeHtml(customer.phone || 'بدون شماره')}</div>
        <div>کد: ${escapeHtml(customer.id)}</div>
    </div>
    
    <div class="footer">
        <div>${persianDate} - ${time}</div>
        <div>سیستم مدیریت خیاطی ALFAJR</div>
    </div>
    
    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
    }
}

function printProfessionalInvoice() {
    if (currentCustomerIndex === null) {
        showNotification('لطفاً ابتدا یک مشتری انتخاب کنید', 'warning');
        return;
    }

    const customer = customers[currentCustomerIndex];
    const today = new Date();
    const persianDate = today.toLocaleDateString('fa-IR');
    
    const printContent = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <title>فاکتور ALFAJR</title>
    <style>
        body { 
            width: 72mm; 
            padding: 5mm; 
            font-family: Tahoma, Arial, sans-serif; 
            font-size: 14px; 
            margin: 0 auto;
            background: white;
            color: black;
            line-height: 1.5;
        }
        .invoice {
            padding: 3mm;
        }
        .header {
            text-align: center;
            padding-bottom: 2mm;
            margin-bottom: 3mm;
        }
        .customer-info {
            margin: 3mm 0;
            padding: 2mm;
            background: #f5f5f5;
            border-radius: 1px;
        }
        .price-section {
            text-align: center;
            margin: 3mm 0;
            padding: 2mm;
            border: 1px solid #000;
            border-radius: 1px;
        }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <div style="font-size: 18px; font-weight: bold;">ALFAJR خیاطی</div>
            <div style="font-size: 12px;">۰۷۹۹۷۹۹۰۰۹</div>
        </div>
        
        <div class="customer-info">
            <div><strong>مشتری:</strong> ${escapeHtml(customer.name || 'بدون نام')}</div>
            <div><strong>تلفن:</strong> ${escapeHtml(customer.phone || 'بدون شماره')}</div>
            <div><strong>کد:</strong> ${escapeHtml(customer.id)}</div>
            <div><strong>تاریخ:</strong> ${persianDate}</div>
        </div>
        
        ${customer.sewingPriceAfghani ? `
        <div class="price-section">
            <div><strong>مبلغ قابل پرداخت</strong></div>
            <div style="font-size: 16px; font-weight: bold;">${formatPrice(customer.sewingPriceAfghani)} افغانی</div>
        </div>
        ` : ''}
    </div>
    
    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
    }
}

// ========== GLOBAL EXPORTS ==========
window.addCustomer = addCustomer;
window.searchCustomer = searchCustomer;
window.openProfile = openProfile;
window.backHome = backHome;
window.deleteCustomer = deleteCustomer;
window.deleteCurrentCustomer = deleteCurrentCustomer;
window.printFullTable = printFullTable;
window.printProfessionalInvoice = printProfessionalInvoice;
window.formatPrice = formatPrice;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// ========== START APP ==========
document.addEventListener('DOMContentLoaded', initializeApp);

console.log('ALFAJR App initialized - Version 5.0');
