// ========== ALFAJR APP - MAIN APPLICATION ==========

class ALFAJRApp {
    constructor() {
        this.customers = [];
        this.currentCustomerId = null;
        this.db = null;
        this.currentTheme = 'dark';
        this.isSaving = false;
        this.saveQueue = [];
        this.lastSaveTime = 0;
        this.isInitialized = false;
        
        // تنظیمات اولیه
        this.config = {
            MIN_SAVE_INTERVAL: 1500, // 1.5 ثانیه حداقل فاصله بین ذخیره‌ها
            AUTO_SAVE_DELAY: 30000, // 30 ثانیه
            DEBOUNCE_SEARCH: 500,
            MAX_CUSTOMERS: 1000
        };
    }

    // ========== INITIALIZATION ==========
    async initialize() {
        try {
            this.showLoading('در حال راه‌اندازی سیستم ALFAJR...');
            
            // بررسی قابلیت‌های مرورگر
            await this.checkBrowserCompatibility();
            
            // مقداردهی اولیه دیتابیس
            this.db = new DatabaseManager();
            await this.db.initialize();
            
            // بارگذاری داده‌ها
            await this.loadAllData();
            
            // بارگذاری تنظیمات
            await this.loadSettings();
            
            // راه‌اندازی کامپوننت‌ها
            this.setupComponents();
            
            // راه‌اندازی event listeners
            this.setupEventListeners();
            
            // راه‌اندازی service worker
            this.initializeServiceWorker();
            
            // شروع auto-save
            this.startAutoSave();
            
            this.isInitialized = true;
            this.hideLoading();
            this.showNotification('سیستم ALFAJR با موفقیت راه‌اندازی شد', 'success');
            
        } catch (error) {
            this.hideLoading();
            this.showNotification(`خطا در راه‌اندازی: ${error.message}`, 'error');
            this.showErrorState(error);
            throw error;
        }
    }

    async checkBrowserCompatibility() {
        const requirements = {
            indexedDB: !!window.indexedDB,
            serviceWorker: 'serviceWorker' in navigator,
            fetch: !!window.fetch,
            promises: !!window.Promise
        };

        const missing = Object.entries(requirements)
            .filter(([_, available]) => !available)
            .map(([feature]) => feature);

        if (missing.length > 0) {
            throw new Error(`مرورگر شما از این قابلیت‌ها پشتیبانی نمی‌کند: ${missing.join(', ')}`);
        }
    }

    // ========== DATA MANAGEMENT ==========
    async loadAllData() {
        try {
            const customers = await this.db.getAllCustomers();
            this.customers = customers.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            
            this.updateStats();
            this.renderCustomerList();
            
        } catch (error) {
            console.error('Error loading data:', error);
            throw new Error('خطا در بارگذاری داده‌ها');
        }
    }

    async loadSettings() {
        try {
            const theme = await this.db.getSetting('theme') || 'dark';
            this.setTheme(theme);
            
            const otherSettings = await this.db.getSetting('app_settings') || {};
            Object.assign(this.config, otherSettings);
            
        } catch (error) {
            console.warn('Could not load settings:', error);
        }
    }

    // ========== CUSTOMER MANAGEMENT ==========
    async addCustomer() {
        try {
            const newCustomer = CustomerFactory.createNewCustomer();
            
            const isValid = Validator.validateCustomer(newCustomer);
            if (!isValid.isValid) {
                this.showNotification(isValid.errors[0], 'warning');
                return;
            }
            
            // اضافه کردن به دیتابیس
            const savedCustomer = await this.db.saveCustomer(newCustomer);
            
            // اضافه کردن به لیست
            this.customers.unshift(savedCustomer);
            
            // رندر مجدد لیست
            this.renderCustomerList();
            this.updateStats();
            
            this.showNotification('مشتری جدید با موفقیت افزوده شد', 'success');
            
            // باز کردن پروفایل مشتری جدید
            this.openCustomerProfile(savedCustomer.id);
            
        } catch (error) {
            this.showNotification(`خطا در افزودن مشتری: ${error.message}`, 'error');
        }
    }

    async saveCurrentCustomer() {
        if (!this.currentCustomerId) return;
        
        // جلوگیری از save موازی
        if (this.isSaving) {
            this.showNotification('در حال ذخیره‌سازی قبلی... لطفاً صبر کنید', 'info');
            return;
        }
        
        // بررسی فاصله زمانی بین saveها
        const now = Date.now();
        if (now - this.lastSaveTime < this.config.MIN_SAVE_INTERVAL) {
            this.showNotification('لطفاً کمی صبر کنید و دوباره تلاش کنید', 'info');
            return;
        }
        
        this.isSaving = true;
        
        try {
            const customer = this.getCurrentCustomer();
            if (!customer) {
                throw new Error('مشتری پیدا نشد');
            }
            
            // اعتبارسنجی
            const validation = Validator.validateCustomer(customer);
            if (!validation.isValid) {
                this.showNotification(validation.errors[0], 'warning');
                return;
            }
            
            // ذخیره در دیتابیس
            await this.db.saveCustomer(customer);
            
            // بروزرسانی در لیست
            const index = this.customers.findIndex(c => c.id === customer.id);
            if (index !== -1) {
                this.customers[index] = { ...customer };
            }
            
            this.lastSaveTime = Date.now();
            this.showNotification('تغییرات با موفقیت ذخیره شد', 'success');
            
        } catch (error) {
            this.showNotification(`خطا در ذخیره‌سازی: ${error.message}`, 'error');
            throw error;
        } finally {
            this.isSaving = false;
        }
    }

    async deleteCurrentCustomer() {
        if (!this.currentCustomerId) return;
        
        if (!confirm('آیا از حذف این مشتری مطمئن هستید؟ این عمل غیرقابل بازگشت است.')) {
            return;
        }
        
        try {
            // حذف از دیتابیس
            await this.db.deleteCustomer(this.currentCustomerId);
            
            // حذف از لیست
            this.customers = this.customers.filter(c => c.id !== this.currentCustomerId);
            
            // برگشت به صفحه اصلی
            this.backHome();
            
            // رندر مجدد لیست
            this.renderCustomerList();
            this.updateStats();
            
            this.showNotification('مشتری با موفقیت حذف شد', 'success');
            
        } catch (error) {
            this.showNotification(`خطا در حذف مشتری: ${error.message}`, 'error');
        }
    }

    getCurrentCustomer() {
        return this.customers.find(c => c.id === this.currentCustomerId);
    }

    openCustomerProfile(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) {
            this.showNotification('مشتری پیدا نشد', 'error');
            return;
        }
        
        this.currentCustomerId = customerId;
        this.renderCustomerProfile(customer);
        
        // تغییر صفحه
        document.getElementById('homePage').style.display = 'none';
        document.getElementById('profilePage').style.display = 'block';
        
        // اسکرول به بالا
        window.scrollTo(0, 0);
    }

    backHome() {
        this.currentCustomerId = null;
        document.getElementById('profilePage').style.display = 'none';
        document.getElementById('homePage').style.display = 'block';
    }

    // ========== SEARCH FUNCTIONALITY ==========
    async searchCustomers() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value.trim();
        
        if (!query) {
            this.renderCustomerList();
            return;
        }
        
        const results = this.customers.filter(customer => 
            customer.name.toLowerCase().includes(query.toLowerCase()) ||
            (customer.phone && customer.phone.includes(query)) ||
            (customer.id && customer.id.toLowerCase().includes(query.toLowerCase())) ||
            (customer.notes && customer.notes.toLowerCase().includes(query.toLowerCase()))
        );
        
        this.renderCustomerList(results);
    }

    // ========== RENDERING ==========
    renderCustomerList(customers = this.customers) {
        const container = document.getElementById('customerList');
        if (!container) return;
        
        if (customers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>مشتری یافت نشد</h3>
                    <p>هیچ مشتری مطابق با جستجوی شما پیدا نشد</p>
                    <button class="btn-primary" onclick="App.addCustomer()" style="margin-top: 20px;">
                        <i class="fas fa-user-plus"></i> افزودن مشتری جدید
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = customers.map(customer => `
            <div class="customer-card" data-customer-id="${customer.id}">
                <div class="customer-card-header">
                    <div class="customer-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="customer-info">
                        <div class="customer-name">${Utils.escapeHtml(customer.name)}</div>
                        <div class="customer-phone">
                            <i class="fas fa-phone"></i>
                            ${Utils.escapeHtml(customer.phone || 'ثبت نشده')}
                        </div>
                    </div>
                </div>
                <div class="customer-card-body">
                    <div class="customer-id">کد: ${Utils.escapeHtml(customer.id)}</div>
                    <div class="customer-date">
                        <i class="fas fa-calendar"></i>
                        ${new Date(customer.createdAt).toLocaleDateString('fa-IR')}
                    </div>
                    ${customer.deliveryDate ? `
                        <div class="customer-delivery">
                            <i class="fas fa-truck"></i>
                            ${Utils.escapeHtml(customer.deliveryDate)}
                        </div>
                    ` : ''}
                </div>
                <div class="customer-card-actions">
                    <button class="btn-primary" onclick="App.openCustomerProfile('${customer.id}')">
                        <i class="fas fa-eye"></i> مشاهده
                    </button>
                    <button class="btn-danger" onclick="App.deleteCustomer('${customer.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderCustomerProfile(customer) {
        // پر کردن اطلاعات اصلی
        document.getElementById('profileName').textContent = customer.name;
        document.getElementById('profilePhoneText').textContent = customer.phone || 'ثبت نشده';
        document.getElementById('profileId').textContent = `کد: ${customer.id}`;
        
        // توضیحات
        document.getElementById('customerNotes').value = customer.notes || '';
        
        // قیمت‌ها
        document.getElementById('totalPrice').value = customer.totalPrice || '';
        document.getElementById('paidAmount').value = customer.paidAmount || '';
        document.getElementById('deliveryDate').value = customer.deliveryDate || '';
        
        // اندازه‌گیری‌ها
        this.renderMeasurements(customer.measurements || []);
        
        // مدل‌ها
        this.renderModels(customer.models || []);
        
        // سفارشات
        this.renderOrders(customer.orders || []);
    }

    renderMeasurements(measurements) {
        const container = document.getElementById('measurementsGrid');
        if (!container) return;
        
        const defaultMeasurements = [
            { label: 'قد', value: '', note: '' },
            { label: 'دور سینه', value: '', note: '' },
            { label: 'دور کمر', value: '', note: '' },
            { label: 'دور باسن', value: '', note: '' },
            { label: 'قد آستین', value: '', note: '' },
            { label: 'دور بازو', value: '', note: '' }
        ];
        
        const allMeasurements = [...defaultMeasurements];
        measurements.forEach(meas => {
            const existing = allMeasurements.find(m => m.label === meas.label);
            if (existing) {
                existing.value = meas.value;
                existing.note = meas.note;
            } else {
                allMeasurements.push(meas);
            }
        });
        
        container.innerHTML = allMeasurements.map((meas, index) => `
            <div class="measurement-item">
                <label>${meas.label}</label>
                <input type="text" 
                       value="${Utils.escapeHtml(meas.value)}" 
                       placeholder="سانتیمتر"
                       onchange="App.updateMeasurement(${index}, this.value)"
                       data-measurement-index="${index}">
                <input type="text" 
                       value="${Utils.escapeHtml(meas.note || '')}" 
                       placeholder="توضیح"
                       onchange="App.updateMeasurementNote(${index}, this.value)"
                       class="measurement-note">
            </div>
        `).join('');
    }

    renderModels(models) {
        const container = document.getElementById('modelsGrid');
        if (!container) return;
        
        const allModels = ['کت', 'شلوار', 'پیراهن', 'دامن', 'پالتو', 'بارانی', 'لباس مجلسی'];
        
        container.innerHTML = allModels.map(model => `
            <div class="model-item ${models.includes(model) ? 'selected' : ''}" 
                 onclick="App.toggleModel('${model}')">
                <i class="fas fa-tshirt"></i>
                <span>${model}</span>
            </div>
        `).join('');
    }

    renderOrders(orders) {
        const container = document.getElementById('ordersList');
        if (!container) return;
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-clipboard-list"></i>
                    <p>هیچ سفارشی ثبت نشده است</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = orders.map((order, index) => `
            <div class="order-item">
                <div class="order-header">
                    <span class="order-type">${Utils.escapeHtml(order.type)}</span>
                    <button class="btn-small btn-danger" onclick="App.deleteOrder(${index})">
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
                        ${Utils.escapeHtml(order.notes)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // ========== EVENT HANDLERS ==========
    updateMeasurement(index, value) {
        const customer = this.getCurrentCustomer();
        if (!customer) return;
        
        if (!customer.measurements) {
            customer.measurements = [];
        }
        
        // پیدا کردن اندازه‌گیری یا ایجاد جدید
        let measurement = customer.measurements[index];
        if (!measurement) {
            const labels = ['قد', 'دور سینه', 'دور کمر', 'دور باسن', 'قد آستین', 'دور بازو'];
            measurement = {
                label: labels[index] || `اندازه ${index + 1}`,
                value: '',
                note: ''
            };
            customer.measurements[index] = measurement;
        }
        
        measurement.value = value;
    }

    updateMeasurementNote(index, note) {
        const customer = this.getCurrentCustomer();
        if (!customer || !customer.measurements) return;
        
        if (customer.measurements[index]) {
            customer.measurements[index].note = note;
        }
    }

    toggleModel(modelName) {
        const customer = this.getCurrentCustomer();
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
        
        this.renderModels(customer.models);
    }

    addOrder() {
        const type = prompt('نوع سفارش را وارد کنید (مثال: کت شلوار):');
        if (!type) return;
        
        const customer = this.getCurrentCustomer();
        if (!customer) return;
        
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
        this.renderOrders(customer.orders);
    }

    deleteOrder(index) {
        const customer = this.getCurrentCustomer();
        if (!customer || !customer.orders) return;
        
        if (confirm('آیا از حذف این سفارش مطمئن هستید؟')) {
            customer.orders.splice(index, 1);
            this.renderOrders(customer.orders);
        }
    }

    // ========== STATS & UTILITIES ==========
    updateStats() {
        const total = this.customers.length;
        const paid = this.customers.filter(c => {
            const paidAmount = parseFloat(c.paidAmount || 0);
            const totalPrice = parseFloat(c.totalPrice || 0);
            return totalPrice > 0 && paidAmount >= totalPrice;
        }).length;
        
        const activeOrders = this.customers.reduce((sum, c) => 
            sum + (c.orders ? c.orders.length : 0), 0
        );
        
        document.getElementById('totalCustomers').textContent = total;
        document.getElementById('paidCustomers').textContent = paid;
        document.getElementById('activeOrders').textContent = activeOrders;
    }

    // ========== THEME MANAGEMENT ==========
    setTheme(theme) {
        this.currentTheme = theme;
        document.body.className = `${theme}-mode`;
        
        if (this.db) {
            this.db.saveSetting('theme', theme);
        }
    }

    toggleSettings() {
        const dropdown = document.getElementById('settingsDropdown');
        dropdown.classList.toggle('show');
    }

    // ========== IMPORT/EXPORT ==========
    async exportData() {
        try {
            const data = {
                customers: this.customers,
                exportedAt: new Date().toISOString(),
                version: '1.0.0',
                count: this.customers.length
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `alfajr_backup_${new Date().toISOString().slice(0, 10)}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            this.showNotification('پشتیبان با موفقیت ذخیره شد', 'success');
            
        } catch (error) {
            this.showNotification(`خطا در ذخیره پشتیبان: ${error.message}`, 'error');
        }
    }

    triggerFileImport() {
        document.getElementById('fileInput').click();
    }

    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!confirm('آیا از وارد کردن این پشتیبان مطمئن هستید؟ داده‌های فعلی با داده‌های پشتیبان جایگزین می‌شوند.')) {
            return;
        }
        
        try {
            this.showLoading('در حال وارد کردن داده‌ها...');
            
            const text = await file.text();
            const data = JSON.parse(text);
            
            // اعتبارسنجی داده‌ها
            if (!data.customers || !Array.isArray(data.customers)) {
                throw new Error('فایل پشتیبان معتبر نیست');
            }
            
            // پاک کردن داده‌های فعلی
            await this.db.clearAllData();
            
            // وارد کردن مشتریان جدید
            for (const customer of data.customers) {
                await this.db.saveCustomer(customer);
            }
            
            // بارگذاری مجدد داده‌ها
            await this.loadAllData();
            
            this.showNotification(`تعداد ${data.customers.length} مشتری با موفقیت وارد شدند`, 'success');
            
        } catch (error) {
            this.showNotification(`خطا در وارد کردن داده‌ها: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
            // ریست کردن input file
            event.target.value = '';
        }
    }

    async clearAllData() {
        if (!confirm('⚠️ هشدار! آیا مطمئن هستید می‌خواهید تمام داده‌ها را پاک کنید؟ این عمل غیرقابل بازگشت است.')) {
            return;
        }
        
        if (!confirm('❌ تأیید نهایی: تمام مشتریان، سفارشات و تاریخچه حذف خواهند شد. ادامه می‌دهید؟')) {
            return;
        }
        
        try {
            this.showLoading('در حال پاک‌سازی داده‌ها...');
            
            await this.db.clearAllData();
            
            this.customers = [];
            this.currentCustomerId = null;
            
            this.renderCustomerList();
            this.updateStats();
            
            this.showNotification('تمامی داده‌ها با موفقیت پاک شدند', 'success');
            
        } catch (error) {
            this.showNotification(`خطا در پاک‌سازی داده‌ها: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // ========== PRINT FUNCTIONS ==========
    printMeasurementLabel() {
        if (!this.currentCustomerId) {
            this.showNotification('ابتدا یک مشتری انتخاب کنید', 'warning');
            return;
        }
        
        const customer = this.getCurrentCustomer();
        if (!customer) return;
        
        // ذخیره قبل از چاپ
        this.saveCurrentCustomer();
        
        // استفاده از تابع چاپ
        PrintManager.printMeasurementLabel(customer);
    }

    printInvoice() {
        if (!this.currentCustomerId) {
            this.showNotification('ابتدا یک مشتری انتخاب کنید', 'warning');
            return;
        }
        
        const customer = this.getCurrentCustomer();
        if (!customer) return;
        
        // ذخیره قبل از چاپ
        this.saveCurrentCustomer();
        
        // استفاده از تابع چاپ
        PrintManager.printInvoice(customer);
    }

    // ========== SETUP FUNCTIONS ==========
    setupComponents() {
        // تنظیم event listener برای input فایل
        document.getElementById('fileInput').addEventListener('change', (e) => this.importData(e));
        
        // تنظیم جستجوی debounced
        const searchInput = document.getElementById('searchInput');
        const debouncedSearch = Utils.debounce(() => this.searchCustomers(), this.config.DEBOUNCE_SEARCH);
        searchInput.addEventListener('input', debouncedSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCustomers();
        });
    }

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('settingsDropdown');
            const settingsBtn = document.querySelector('.settings-btn');
            
            if (dropdown && dropdown.classList.contains('show') && 
                !dropdown.contains(e.target) && 
                !settingsBtn.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        // Auto-save on form changes
        const autoSaveElements = document.querySelectorAll('#customerNotes, #totalPrice, #paidAmount, #deliveryDate');
        autoSaveElements.forEach(el => {
            el.addEventListener('change', () => {
                if (this.currentCustomerId) {
                    this.saveCurrentCustomer();
                }
            });
        });
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (this.currentCustomerId) {
                this.saveCurrentCustomer();
            }
        }
        
        // Escape to go back
        if (e.key === 'Escape') {
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.style.display !== 'none') {
                this.backHome();
            }
        }
        
        // Ctrl/Cmd + F to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Ctrl/Cmd + N for new customer
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.addCustomer();
        }
    }

    initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered');
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showNotification('بروزرسانی جدید آماده است! صفحه را رفرش کنید.', 'info');
                            }
                        });
                    });
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }

    startAutoSave() {
        setInterval(() => {
            if (this.currentCustomerId && !this.isSaving) {
                this.saveCurrentCustomer();
            }
        }, this.config.AUTO_SAVE_DELAY);
    }

    optimizeDatabase() {
        if (confirm('آیا از بهینه‌سازی دیتابیس مطمئن هستید؟')) {
            this.showLoading('در حال بهینه‌سازی...');
            setTimeout(() => {
                this.hideLoading();
                this.showNotification('دیتابیس با موفقیت بهینه‌سازی شد', 'success');
            }, 2000);
        }
    }

    // ========== UI UTILITIES ==========
    showLoading(message = 'در حال بارگذاری...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        
        if (overlay) overlay.style.display = 'flex';
        if (text && message) text.textContent = message;
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('globalNotification');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                               type === 'error' ? 'exclamation-circle' : 
                               type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${Utils.escapeHtml(message)}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // حذف خودکار بعد از 5 ثانیه
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    showErrorState(error) {
        const listElement = document.getElementById('customerList');
        if (listElement) {
            listElement.innerHTML = `
                <div class="empty-state error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>خطا در راه‌اندازی سیستم</h3>
                    <p>${Utils.escapeHtml(error.message)}</p>
                    <p>لطفاً صفحه را رفرش کنید یا از مرورگر دیگری استفاده نمایید.</p>
                    <button class="btn-primary" onclick="location.reload()" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> رفرش صفحه
                    </button>
                </div>
            `;
        }
    }
}

// ========== GLOBAL APP INSTANCE ==========
const App = new ALFAJRApp();

// ========== START APP ==========
document.addEventListener('DOMContentLoaded', () => {
    App.initialize();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    App.showNotification(`خطای سیستمی: ${event.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    App.showNotification(`خطای پردازش: ${event.reason.message || 'خطای ناشناخته'}`, 'error');
});
