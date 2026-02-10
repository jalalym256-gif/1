// ========== MAIN APP INITIALIZATION ==========
async function initializeApp() {
    try {
        showLoading('در حال راه‌اندازی سیستم ALFAJR...');
        
        if (!window.indexedDB) {
            throw new Error('مرورگر شما از IndexedDB پشتیبانی نمی‌کند');
        }
        
        dbManager = new DatabaseManager();
        await dbManager.init();
        
        dbManager.onUpdate((type, data) => {
            switch (type) {
                case 'customer_saved':
                case 'customer_deleted':
                case 'data_cleared':
                    updateStats();
                    break;
            }
        });
        
        await loadCustomers();
        await loadSettings();
        
        const savedTheme = await dbManager.getSettings('theme') || 'dark';
        if (savedTheme === 'light') toggleLightMode();
        else if (savedTheme === 'vivid') toggleVividMode();
        else toggleDarkMode();
        
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
                    <p>لطفاً صفحه را رفرش کنید یا از مرورگر دیگری استفاده نمایید.</p>
                    <button class="btn-primary" onclick="location.reload()" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> رفرش صفحه
                    </button>
                </div>
            `;
        }
    }
}

async function loadSettings() {
    try {
        const autoSave = await dbManager.getSettings('autoSave');
        if (autoSave === null) {
            await dbManager.saveSettings('autoSave', true);
        }
    } catch (error) {}
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const debouncedSearch = debounce(searchCustomer, 500);
        searchInput.addEventListener('input', debouncedSearch);
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchCustomer();
        });
    }
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', loadDataFromFile);
    }
    
    const notesTextarea = document.getElementById('customerNotes');
    if (notesTextarea) {
        notesTextarea.addEventListener('input', updateNotes);
    }
    
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (currentCustomerIndex !== null) {
                saveCustomer();
                showNotification('تغییرات ذخیره شد', 'success');
            }
        }
        
        if (e.key === 'Escape') {
            const profilePage = document.getElementById('profilePage');
            if (profilePage && profilePage.style.display !== 'none') {
                backHome();
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            addCustomer();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            if (currentCustomerIndex !== null) {
                printFullTable();
            }
        }
        
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            window.scrollBy({
                top: e.key === 'ArrowDown' ? 100 : -100,
                behavior: 'smooth'
            });
        }
    });
    
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

// ========== STATISTICS ==========
async function updateStats() {
    try {
        const totalCustomers = customers.length;
        const totalOrders = customers.reduce((sum, customer) => sum + (customer.orders ? customer.orders.length : 0), 0);
        const paidCustomers = customers.filter(c => c.paymentReceived).length;
        
        document.getElementById('totalCustomers').textContent = totalCustomers;
        document.getElementById('activeOrders').textContent = totalOrders;
        document.getElementById('paidCustomers').textContent = paidCustomers;
        
    } catch (error) {}
}

// ========== DATA MANAGEMENT ==========
async function saveDataToFile() {
    try {
        showLoading('در حال آماده‌سازی داده‌ها...');
        
        const backupData = await dbManager.createBackup();
        
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
        link.download = `alfajr-backup-${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        hideLoading();
        showNotification(`پشتیبان با موفقیت ذخیره شد`, 'success');
    } catch (error) {
        hideLoading();
        showNotification('خطا در ذخیره فایل: ' + error.message, 'error');
    }
}

function loadDataFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm('آیا از وارد کردن داده‌های جدید مطمئن هستید؟\nاین عمل ممکن است داده‌های فعلی را بازنویسی کند.')) {
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            showLoading('در حال وارد کردن داده‌ها...');
            const backupData = JSON.parse(e.target.result);
            
            if (!backupData || !backupData.customers || !Array.isArray(backupData.customers)) {
                throw new Error('فرمت فایل نامعتبر است');
            }
            
            await dbManager.clearAllData();
            
            let importedCount = 0;
            
            for (const customerData of backupData.customers) {
                try {
                    if (customerData.deleted) continue;
                    const customer = Customer.fromObject(customerData);
                    await dbManager.saveCustomer(customer);
                    importedCount++;
                } catch (error) {}
            }
            
            await loadCustomers();
            
            hideLoading();
            showNotification(`${importedCount} مشتری با موفقیت وارد شد`, 'success');
            
            event.target.value = '';
        } catch (error) {
            hideLoading();
            showNotification('خطا در وارد کردن داده‌ها: ' + error.message, 'error');
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

async function clearAllData() {
    if (!confirm('⚠️ ⚠️ ⚠️\n\nآیا از پاک‌سازی تمام داده‌ها مطمئن هستید؟\n\nاین عمل قابل بازگشت نیست و تمام مشتریان، سفارشات و تنظیمات پاک خواهند شد.')) return;
    
    if (!confirm('❌ ❌ ❌\n\nآخرین هشدار!\n\nتمام اطلاعات شما حذف خواهد شد. برای ادامه مجدداً تأیید کنید.')) return;
    
    try {
        showLoading('در حال پاک‌سازی کامل دیتابیس...');
        await dbManager.clearAllData();
        customers = [];
        currentCustomerIndex = null;
        await loadCustomers();
        backHome();
        hideLoading();
        showNotification('تمامی داده‌ها با موفقیت پاک شدند', 'success');
    } catch (error) {
        hideLoading();
        showNotification('خطا در پاک‌سازی: ' + error.message, 'error');
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
window.formatPrice = formatPrice;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// ========== START APP ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('ALFAJR App initialized - Version 5.0');