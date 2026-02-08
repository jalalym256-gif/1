// ========== ALFAJR APP - MAIN APPLICATION ==========

const App = {
    // متغیرهای وضعیت
    customers: [],
    currentCustomerId: null,
    db: null,
    currentTheme: 'dark',
    isSaving: false,
    lastSaveTime: 0,
    isInitialized: false,
    autoSaveTimer: null,
    
    config: {
        MIN_SAVE_INTERVAL: 1500,
        AUTO_SAVE_DELAY: 2000,
        DEBOUNCE_SEARCH: 500,
        MAX_CUSTOMERS: 1000
    },

    // ========== INITIALIZATION ==========
    async initialize() {
        try {
            this.showLoading('در حال راه‌اندازی سیستم ALFAJR...');
            
            // راه‌اندازی دیتابیس
            this.db = new DatabaseManager();
            await this.db.initialize();
            
            // بارگذاری داده‌ها
            await this.loadAllData();
            
            // بارگذاری تنظیمات
            const theme = await this.db.getSetting('theme') || 'dark';
            this.setTheme(theme);
            
            // راه‌اندازی event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            this.hideLoading();
            this.showNotification('سیستم ALFAJR با موفقیت راه‌اندازی شد', 'success');
            
            console.log('App initialized successfully');
            
        } catch (error) {
            this.hideLoading();
            this.showNotification(`خطا در راه‌اندازی: ${error.message}`, 'error');
            this.showErrorState(error);
            console.error('Initialization error:', error);
        }
    },

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
            this.showNotification('خطا در بارگذاری داده‌ها', 'error');
        }
    },

    // ========== CUSTOMER MANAGEMENT ==========
    async addCustomer() {
        try {
            console.log('Adding new customer...');
            
            const newCustomer = CustomerFactory.createNewCustomer();
            
            // اعتبارسنجی
            const isValid = Validator.validateCustomer(newCustomer);
            if (!isValid.isValid) {
                this.showNotification('لطفاً نام مشتری را وارد کنید', 'warning');
                return;
            }
            
            // ذخیره در دیتابیس
            const savedCustomer = await this.db.saveCustomer(newCustomer);
            
            // اضافه به لیست
            this.customers.unshift(savedCustomer);
            
            // رندر مجدد
            this.renderCustomerList();
            this.updateStats();
            
            this.showNotification('مشتری جدید با موفقیت افزوده شد', 'success');
            
            // باز کردن پروفایل
            this.openCustomerProfile(savedCustomer.id);
            
        } catch (error) {
            console.error('Add customer error:', error);
            this.showNotification(`خطا در افزودن مشتری: ${error.message}`, 'error');
        }
    },

    async saveCurrentCustomer() {
        if (!this.currentCustomerId) {
            this.showNotification('هیچ مشتری انتخاب نشده است', 'warning');
            return;
        }
        
        if (this.isSaving) {
            this.showNotification('در حال ذخیره‌سازی... لطفاً صبر کنید', 'info');
            return;
        }
        
        const now = Date.now();
        if (now - this.lastSaveTime < this.config.MIN_SAVE_INTERVAL) {
            this.showNotification('لطفاً کمی صبر کنید', 'info');
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
            
            // بروزرسانی زمان
            customer.updatedAt = new Date().toISOString();
            
            // ذخیره در دیتابیس
            await this.db.saveCustomer(customer);
            
            // بروزرسانی در لی��ت
            const index = this.customers.findIndex(c => c.id === customer.id);
            if (index !== -1) {
                this.customers[index] = { ...customer };
            }
            
            this.lastSaveTime = Date.now();
            this.showNotification('تغییرات ذخیره شد', 'success');
            
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification(`خطا در ذخیره‌سازی: ${error.message}`, 'error');
        } finally {
            this.isSaving = false;
        }
    },

    async deleteCurrentCustomer() {
        if (!this.currentCustomerId) {
            this.showNotification('هیچ مشتری انتخاب نشده است', 'warning');
            return;
        }
        
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
            
            // رندر مجدد
            this.renderCustomerList();
            this.updateStats();
            
            this.showNotification('مشتری حذف شد', 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification(`خطا در حذف: ${error.message}`, 'error');
        }
    },

    async deleteCustomer(customerId) {
        if (!confirm('آیا از حذف این مشتری مطمئن هستید؟')) {
            return;
        }
        
        try {
            // حذف از دیتابیس
            await this.db.deleteCustomer(customerId);
            
            // حذف از لیست
            this.customers = this.customers.filter(c => c.id !== customerId);
            
            // رندر مجدد
            this.renderCustomerList();
            this.updateStats();
            
            this.showNotification('مشتری حذف شد', 'success');
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification(`خطا در حذف: ${error.message}`, 'error');
        }
    },

    getCurrentCustomer() {
        return this.customers.find(c => c.id === this.currentCustomerId);
    },

    openCustomerProfile(customerId) {
        console.log('Opening profile for:', customerId);
        
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) {
            this.showNotification('مشتری پیدا نشد', 'error');
            return;
        }
        
        this.currentCustomerId = customerId;
        this.renderCustomerProfile(customer);
        
        // نمایش صفحه پروفایل
        document.getElementById('homePage').style.display = 'none';
        document.getElementById('profilePage').style.display = 'block';
        
        // اسکرول به بالا
        window.scrollTo(0, 0);
    },

    backHome() {
        console.log('Going back home');
        
        this.currentCustomerId = null;
        document.getElementById('profilePage').style.display = 'none';
        document.getElementById('homePage').style.display = 'block';
        
        // رندر مجدد لیست
        this.renderCustomerList();
    },

    // ========== SEARCH ==========
    searchCustomers() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value.trim();
        console.log('Searching for:', query);
        
        if (!query) {
            this.renderCustomerList();
            return;
        }
        
        const results = this.customers.filter(customer => 
            customer.name.toLowerCase().includes(query.toLowerCase()) ||
            (customer.phone && customer.phone.includes(query)) ||
            (customer.id && customer.id.toLowerCase().includes(query.toLowerCase()))
        );
        
        this.renderCustomerList(results);
    },

    // ========== RENDERING ==========
    renderCustomerList(customers = this.customers) {
        const container = document.getElementById('customerList');
        if (!container) {
            console.error('Customer list container not found');
            return;
        }
        
        console.log('Rendering', customers.length, 'customers');
        
        if (customers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>${this.customers.length === 0 ? 'هنوز مشتری ثبت نشده است' : 'مشتری یافت نشد'}</h3>
                    <p>${this.customers.length === 0 ? 'برای شروع، روی دکمه "مشتری جدید" کلیک کنید' : 'هیچ مشتری مطابق با جستجوی شما پیدا نشد'}</p>
                    <button class="btn-primary" onclick="App.addCustomer()" style="margin-top: 20px;">
                        <i class="fas fa-user-plus"></i> ${this.customers.length === 0 ? 'افزودن اولین مشتری' : 'افزودن مشتری جدید'}
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
    },

    renderCustomerProfile(customer) {
        console.log('Rendering profile for:', customer.name);
        
        // اطلاعات اصلی
        document.getElementById('profileName').textContent = customer.name;
        document.getElementById('profilePhoneText').textContent = customer.phone || 'ثبت نشده';
        document.getElementById('profileId').textContent = `کد: ${customer.id}`;
        
        // توضیحات
        const notesTextarea = document.getElementById('customerNotes');
        if (notesTextarea) {
            notesTextarea.value = customer.notes || '';
            
            // اضافه کردن event listener برای auto-save
            notesTextarea.oninput = () => {
                customer.notes = notesTextarea.value;
                this.autoSaveCustomer(customer);
            };
        }
        
        // قیمت‌ها
        const totalPriceInput = document.getElementById('totalPrice');
        const paidAmountInput = document.getElementById('paidAmount');
        const deliveryDateInput = document.getElementById('deliveryDate');
        
        if (totalPriceInput) {
            totalPriceInput.value = customer.totalPrice || '';
            totalPriceInput.onchange = () => {
                customer.totalPrice = totalPriceInput.value;
                this.autoSaveCustomer(customer);
            };
        }
        
        if (paidAmountInput) {
            paidAmountInput.value = customer.paidAmount || '';
            paidAmountInput.onchange = () => {
                customer.paidAmount = paidAmountInput.value;
                this.autoSaveCustomer(customer);
            };
        }
        
        if (deliveryDateInput) {
            deliveryDateInput.value = customer.deliveryDate || '';
            deliveryDateInput.onchange = () => {
                customer.deliveryDate = deliveryDateInput.value;
                this.autoSaveCustomer(customer);
            };
        }
        
        // اندازه‌گیری‌ها
        this.renderMeasurements(customer);
        
        // مدل‌ها
        this.renderModels(customer);
        
        // سفارشات
        this.renderOrders(customer);
    },

    renderMeasurements(customer) {
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
        
        // ادغام اندازه‌گیری‌های پیش‌فرض با اندازه‌گیری‌های موجود
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
        
        container.innerHTML = allMeasurements.map((meas) => {
            return `
                <div class="measurement-item">
                    <label>${meas.label}</label>
                    <input type="text" 
                           value="${Utils.escapeHtml(meas.value)}" 
                           placeholder="سانتیمتر"
                           data-label="${meas.label}"
                           onchange="App.updateMeasurement('${customer.id}', '${meas.label}', this.value)">
                    <input type="text" 
                           value="${Utils.escapeHtml(meas.note || '')}" 
                           placeholder="توضیح"
                           data-label="${meas.label}"
                           onchange="App.updateMeasurementNote('${customer.id}', '${meas.label}', this.value)"
                           class="measurement-note">
                </div>
            `;
        }).join('');
    },

    updateMeasurement(customerId, label, value) {
        const customer = this.customers.find(c => c.id === customerId);
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
        this.autoSaveCustomer(customer);
    },

    updateMeasurementNote(customerId, label, note) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer || !customer.measurements) return;
        
        let measurement = customer.measurements.find(m => m.label === label);
        if (!measurement) {
            measurement = { label, value: '', note: '' };
            customer.measurements.push(measurement);
        }
        
        measurement.note = note;
        this.autoSaveCustomer(customer);
    },

    renderModels(customer) {
        const container = document.getElementById('modelsGrid');
        if (!container) return;
        
        if (!customer.models) {
            customer.models = [];
        }
        
        const allModels = ['کت', 'شلوار', 'پیراهن', 'دامن', 'پالتو', 'بارانی', 'لباس مجلسی'];
        
        container.innerHTML = allModels.map(model => `
            <div class="model-item ${customer.models.includes(model) ? 'selected' : ''}" 
                 onclick="App.toggleModel('${customer.id}', '${model}')">
                <i class="fas fa-tshirt"></i>
                <span>${model}</span>
            </div>
        `).join('');
    },

    toggleModel(customerId, modelName) {
        const customer = this.customers.find(c => c.id === customerId);
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
        
        this.renderModels(customer);
        this.autoSaveCustomer(customer);
    },

    renderOrders(customer) {
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
                    <span class="order-type">${Utils.escapeHtml(order.type)}</span>
                    <button class="btn-small btn-danger" onclick="App.deleteOrder('${customer.id}', ${index})">
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
    },

    addOrder() {
        if (!this.currentCustomerId) {
            this.showNotification('ابتدا یک مشتری انتخاب کنید', 'warning');
            return;
        }
        
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
        this.renderOrders(customer);
        this.autoSaveCustomer(customer);
    },

    deleteOrder(customerId, index) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer || !customer.orders) return;
        
        if (confirm('آیا از حذف این سفارش مطمئن هستید؟')) {
            customer.orders.splice(index, 1);
            this.renderOrders(customer);
            this.autoSaveCustomer(customer);
        }
    },

    // ========== PRINT METHODS ==========
    printMeasurementLabel() {
        const customer = this.getCurrentCustomer();
        PrintManager.printMeasurementLabel(customer);
    },

    printInvoice() {
        const customer = this.getCurrentCustomer();
        PrintManager.printInvoice(customer);
    },

    // ========== EXPORT/IMPORT ==========
    saveDataToFile() {
        const data = {
            customers: this.customers,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alfajr-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('پشتیبان ذخیره شد', 'success');
    },

    loadDataFromFile() {
        document.getElementById('fileInput').click();
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.customers && Array.isArray(data.customers)) {
                    this.customers = data.customers;
                    this.renderCustomerList();
                    this.updateStats();
                    this.showNotification(`تعداد ${data.customers.length} مشتری وارد شد`, 'success');
                    
                    // ذخیره در دیتابیس
                    data.customers.forEach(customer => {
                        this.db.saveCustomer(customer);
                    });
                }
            } catch (error) {
                this.showNotification('فایل پشتیبان معتبر نیست', 'error');
            }
        };
        reader.readAsText(file);
        
        // ریست کردن input
        event.target.value = '';
    },

    // ========== UTILITIES ==========
    autoSaveCustomer(customer) {
        // Debounced auto-save
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(async () => {
            try {
                await this.db.saveCustomer(customer);
                console.log('Customer auto-saved:', customer.id);
            } catch (error) {
                console.error('Auto-save error:', error);
            }
        }, this.config.AUTO_SAVE_DELAY);
    },

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
    },

    setTheme(theme) {
        this.currentTheme = theme;
        document.body.className = `${theme}-mode`;
        
        if (this.db) {
            this.db.saveSetting('theme', theme);
        }
    },

    toggleSettings() {
        const dropdown = document.getElementById('settingsDropdown');
        dropdown.classList.toggle('show');
    },

    // ========== UI HELPERS ==========
    showLoading(message = 'در حال بارگذاری...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        
        if (overlay) overlay.style.display = 'flex';
        if (text && message) text.textContent = message;
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    },

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
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    },

    showErrorState(error) {
        const listElement = document.getElementById('customerList');
        if (listElement) {
            listElement.innerHTML = `
                <div class="empty-state error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>خطا در راه‌اندازی سیستم</h3>
                    <p>${Utils.escapeHtml(error.message)}</p>
                    <p>لطفاً صفحه را رفرش کنید</p>
                    <button class="btn-primary" onclick="location.reload()" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> رفرش صفحه
                    </button>
                </div>
            `;
        }
    },

    async optimizeDatabase() {
        this.showNotification('دیتابیس در حال بهینه‌سازی...', 'info');
        try {
            await this.db.optimize();
            this.showNotification('دیتابیس بهینه‌سازی شد', 'success');
        } catch (error) {
            this.showNotification('خطا در بهینه‌سازی دیتابیس', 'error');
        }
    },

    async clearAllData() {
        if (confirm('⚠️ آیا مطمئن هستید؟ تمام داده‌ها حذف خواهند شد!')) {
            try {
                await this.db.clearAllData();
                this.customers = [];
                this.currentCustomerId = null;
                this.renderCustomerList();
                this.updateStats();
                this.showNotification('همه داده‌ها پاک شدند', 'success');
            } catch (error) {
                this.showNotification('خطا در پاک‌سازی داده‌ها', 'error');
            }
        }
    },

    // ========== SETUP ==========
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // جستجو با Enter
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchCustomers();
                }
            });
            
            // Debounced search on input
            searchInput.addEventListener('input', Utils.debounce(() => {
                this.searchCustomers();
            }, this.config.DEBOUNCE_SEARCH));
        }
        
        // فایل input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.importData(e));
        }
        
        // بستن dropdown با کلیک خارج
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
            // Ctrl+S برای ذخیره
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveCurrentCustomer();
            }
            
            // Escape برای برگشت
            if (e.key === 'Escape') {
                const profilePage = document.getElementById('profilePage');
                if (profilePage && profilePage.style.display !== 'none') {
                    this.backHome();
                }
            }
        });
        
        console.log('Event listeners setup complete');
    }
};

// ========== GLOBAL FUNCTIONS ==========
// این توابع global هستن و از HTML فراخوانی میشن
window.addCustomer = () => App.addCustomer();
window.searchCustomer = () => App.searchCustomers();
window.openProfile = (id) => App.openCustomerProfile(id);
window.backHome = () => App.backHome();
window.saveCustomer = () => App.saveCurrentCustomer();
window.deleteCustomer = (id) => App.deleteCustomer(id);
window.deleteCurrentCustomer = () => App.deleteCurrentCustomer();
window.updateMeasurement = (customerId, label, value) => App.updateMeasurement(customerId, label, value);
window.updateMeasurementNote = (customerId, label, note) => App.updateMeasurementNote(customerId, label, note);
window.toggleModel = (customerId, model) => App.toggleModel(customerId, model);
window.addOrder = () => App.addOrder();
window.deleteOrder = (customerId, index) => App.deleteOrder(customerId, index);
window.printMeasurementLabel = () => App.printMeasurementLabel();
window.printInvoice = () => App.printInvoice();
window.toggleDarkMode = () => App.setTheme('dark');
window.toggleLightMode = () => App.setTheme('light');
window.toggleVividMode = () => App.setTheme('vivid');
window.toggleSettings = () => App.toggleSettings();
window.saveDataToFile = () => App.saveDataToFile();
window.loadDataFromFile = () => App.loadDataFromFile();
window.optimizeDatabase = () => App.optimizeDatabase();
window.clearAllData = () => App.clearAllData();

// ========== START APP ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting app...');
    App.initialize();
});

// Global error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (App.isInitialized) {
        App.showNotification(`خطا: ${event.message}`, 'error');
    }
});
