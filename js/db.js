// ========== DATABASE MANAGER ==========

class DatabaseManager {
    constructor() {
        this.dbName = 'ALFAJR_DB';
        this.dbVersion = 3;
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                reject(new Error('خطا در اتصال به پایگاه داده'));
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // ایجاد store برای مشتریان
                if (!db.objectStoreNames.contains('customers')) {
                    const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
                    customerStore.createIndex('name', 'name', { unique: false });
                    customerStore.createIndex('phone', 'phone', { unique: false });
                    customerStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                // ایجاد store برای تنظیمات
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // ========== CUSTOMER OPERATIONS ==========
    async saveCustomer(customer) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('دیتابیس راه‌اندازی نشده است'));
                return;
            }
            
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const store = transaction.objectStore('customers');
            
            // بروزرسانی زمان ویرایش
            customer.updatedAt = new Date().toISOString();
            
            const request = store.put(customer);
            
            request.onsuccess = () => resolve(customer);
            request.onerror = () => reject(new Error('خطا در ذخیره مشتری'));
        });
    }

    async getCustomer(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('دیتابیس راه‌اندازی نشده است'));
                return;
            }
            
            const transaction = this.db.transaction(['customers'], 'readonly');
            const store = transaction.objectStore('customers');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('خطا در دریافت مشتری'));
        });
    }

    async getAllCustomers() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('دیتابیس راه‌اندازی نشده است'));
                return;
            }
            
            const transaction = this.db.transaction(['customers'], 'readonly');
            const store = transaction.objectStore('customers');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error('خطا در دریافت لیست مشتریان'));
        });
    }

    async deleteCustomer(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('دیتابیس راه‌اندازی نشده است'));
                return;
            }
            
            const transaction = this.db.transaction(['customers'], 'readwrite');
            const store = transaction.objectStore('customers');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('خطا در حذف مشتری'));
        });
    }

    async searchCustomers(query) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('دیتابیس راه‌اندازی نشده است'));
                return;
            }
            
            const transaction = this.db.transaction(['customers'], 'readonly');
            const store = transaction.objectStore('customers');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const customers = request.result || [];
                const results = customers.filter(customer => 
                    customer.name.toLowerCase().includes(query.toLowerCase()) ||
                    (customer.phone && customer.phone.includes(query)) ||
                    (customer.id && customer.id.toLowerCase().includes(query.toLowerCase())) ||
                    (customer.notes && customer.notes.toLowerCase().includes(query.toLowerCase()))
                );
                resolve(results);
            };
            
            request.onerror = () => reject(new Error('خطا در جستجوی مشتریان'));
        });
    }

    // ========== SETTINGS OPERATIONS ==========
    async saveSetting(key, value) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('دیتابیس راه‌اندازی نشده است'));
                return;
            }
            
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('خطا در ذخیره تنظیمات'));
        });
    }

    async getSetting(key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('دیتابیس راه‌اندازی نشده است'));
                return;
            }
            
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(new Error('خطا در دریافت تنظیمات'));
        });
    }

    // ========== DATABASE MAINTENANCE ==========
    async clearAllData() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('دیتابیس راه‌اندازی نشده است'));
                return;
            }
            
            const transaction = this.db.transaction(['customers', 'settings'], 'readwrite');
            
            // پاک کردن مشتریان
            const customerStore = transaction.objectStore('customers');
            const customerRequest = customerStore.clear();
            
            // پاک کردن تنظیمات (به جز theme)
            const settingsStore = transaction.objectStore('settings');
            const settingsRequest = settingsStore.openCursor();
            
            settingsRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.key !== 'theme') {
                        cursor.delete();
                    }
                    cursor.continue();
                }
            };
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error('خطا در پاک‌سازی داده‌ها'));
        });
    }

    async getDatabaseSize() {
        return new Promise((resolve, reject) => {
            if (!navigator.storage || !navigator.storage.estimate) {
                resolve('نامشخص');
                return;
            }
            
            navigator.storage.estimate()
                .then(estimate => {
                    const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
                    const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(2);
                    resolve(`${usedMB} MB از ${quotaMB} MB`);
                })
                .catch(() => resolve('نامشخص'));
        });
    }
}
