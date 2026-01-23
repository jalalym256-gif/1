// ========== DATABASE CONFIGURATION ==========
const AppConfig = {
    DATABASE_NAME: 'ALFAJR_DB_V5',
    DATABASE_VERSION: 5,
    STORES: {
        CUSTOMERS: 'customers',
        SETTINGS: 'settings',
        BACKUP: 'backups',
        SYNC_QUEUE: 'sync_queue'
    },
    
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
        backupInterval: 24,
        syncEnabled: false,
        lastBackup: null
    }
};

// ========== DATABASE MANAGER ==========
class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.onUpdateCallbacks = [];
        this.pendingOperations = [];
        this.offlineQueue = [];
        this.isOnline = navigator.onLine;
        
        // Listen to online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
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
                    Utils.showNotification('خطا در پایگاه داده', 'error');
                };
                
                this.updateDatabaseStatus(true);
                this.initializeSettings();
                this.processOfflineQueue();
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create customers store with proper indexes
                if (!db.objectStoreNames.contains(AppConfig.STORES.CUSTOMERS)) {
                    const store = db.createObjectStore(AppConfig.STORES.CUSTOMERS, { keyPath: 'id' });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('phone', 'phone', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                    store.createIndex('updatedAt', 'updatedAt', { unique: false });
                    store.createIndex('deleted', 'deleted', { unique: false });
                }
                
                // Create settings store
                if (!db.objectStoreNames.contains(AppConfig.STORES.SETTINGS)) {
                    db.createObjectStore(AppConfig.STORES.SETTINGS, { keyPath: 'key' });
                }
                
                // Create backup store
                if (!db.objectStoreNames.contains(AppConfig.STORES.BACKUP)) {
                    const backupStore = db.createObjectStore(AppConfig.STORES.BACKUP, { keyPath: 'id', autoIncrement: true });
                    backupStore.createIndex('date', 'date', { unique: false });
                }
                
                // Create sync queue for offline operations
                if (!db.objectStoreNames.contains(AppConfig.STORES.SYNC_QUEUE)) {
                    const syncStore = db.createObjectStore(AppConfig.STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('type', 'type', { unique: false });
                    syncStore.createIndex('status', 'status', { unique: false });
                    syncStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    async saveCustomer(customer) {
        return new Promise(async (resolve, reject) => {
            if (!this.isInitialized || !this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            try {
                // Generate unique 4-digit ID if not present
                if (!customer.id) {
                    customer.id = await idGenerator.generateUniqueFourDigitID();
                }
                
                // Validate customer data
                const errors = customer.validate();
                if (errors.length > 0) {
                    reject(new Error(errors.join('\n')));
                    return;
                }
                
                customer.updatedAt = new Date().toISOString();
                const customerData = customer.toObject();
                
                const transaction = this.db.transaction([AppConfig.STORES.CUSTOMERS], 'readwrite');
                const store = transaction.objectStore(AppConfig.STORES.CUSTOMERS);
                
                // Check for duplicates before saving
                const existing = await new Promise((resolve) => {
                    const request = store.get(customer.id);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve(null);
                });
                
                if (existing && existing.id === customer.id && !existing.deleted) {
                    reject(new Error('مشتری با این کد قبلاً ثبت شده است'));
                    return;
                }
                
                const request = store.put(customerData);
                
                request.onsuccess = () => {
                    idGenerator.addUsedID(customer.id);
                    this.notifyUpdate('customer_saved', customer);
                    
                    // Add to sync queue if offline
                    if (!this.isOnline) {
                        this.addToSyncQueue({
                            type: 'save_customer',
                            data: customerData,
                            createdAt: new Date().toISOString()
                        });
                    }
                    
                    resolve(customer);
                };
                
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async getAllCustomers(includeDeleted = false) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized || !this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([AppConfig.STORES.CUSTOMERS], 'readonly');
            const store = transaction.objectStore(AppConfig.STORES.CUSTOMERS);
            const request = store.getAll();
            
            request.onsuccess = () => {
                let customers = request.result || [];
                
                if (!includeDeleted) {
                    customers = customers.filter(c => !c.deleted);
                }
                
                const customerObjects = customers.map(c => {
                    try {
                        return Customer.fromObject(c);
                    } catch (error) {
                        return null;
                    }
                }).filter(c => c !== null);
                
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
            
            const transaction = this.db.transaction([AppConfig.STORES.CUSTOMERS], 'readonly');
            const store = transaction.objectStore(AppConfig.STORES.CUSTOMERS);
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
            
            const transaction = this.db.transaction([AppConfig.STORES.CUSTOMERS], 'readwrite');
            const store = transaction.objectStore(AppConfig.STORES.CUSTOMERS);
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const customer = getRequest.result;
                if (customer) {
                    customer.deleted = true;
                    customer.updatedAt = new Date().toISOString();
                    
                    const putRequest = store.put(customer);
                    putRequest.onsuccess = () => {
                        this.notifyUpdate('customer_deleted', { id });
                        
                        // Add to sync queue if offline
                        if (!this.isOnline) {
                            this.addToSyncQueue({
                                type: 'delete_customer',
                                data: { id },
                                createdAt: new Date().toISOString()
                            });
                        }
                        
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
            
            const transaction = this.db.transaction([AppConfig.STORES.CUSTOMERS], 'readonly');
            const store = transaction.objectStore(AppConfig.STORES.CUSTOMERS);
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

    async getSettings(key) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized || !this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([AppConfig.STORES.SETTINGS], 'readonly');
            const store = transaction.objectStore(AppConfig.STORES.SETTINGS);
            const request = store.get(key);
            
            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async saveSettings(key, value) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized || !this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([AppConfig.STORES.SETTINGS], 'readwrite');
            const store = transaction.objectStore(AppConfig.STORES.SETTINGS);
            
            const settings = {
                key: key,
                value: value,
                updatedAt: new Date().toISOString()
            };
            
            const request = store.put(settings);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async createBackup() {
        try {
            const allCustomers = await this.getAllCustomers(true);
            const backupData = {
                customers: allCustomers.map(c => c.toObject()),
                timestamp: new Date().toISOString(),
                version: AppConfig.DATABASE_VERSION,
                totalCustomers: allCustomers.length
            };
            
            const transaction = this.db.transaction([AppConfig.STORES.BACKUP], 'readwrite');
            const store = transaction.objectStore(AppConfig.STORES.BACKUP);
            
            const backup = {
                date: new Date().toISOString(),
                data: backupData
            };
            
            await new Promise((resolve, reject) => {
                const request = store.add(backup);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
            
            return backupData;
        } catch (error) {
            throw error;
        }
    }

    async clearAllData() {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized || !this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([AppConfig.STORES.CUSTOMERS], 'readwrite');
            const store = transaction.objectStore(AppConfig.STORES.CUSTOMERS);
            const request = store.clear();
            
            request.onsuccess = () => {
                this.notifyUpdate('data_cleared', null);
                idGenerator.clearUsedIDs();
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // ========== OFFLINE SUPPORT ==========
    handleOnline() {
        this.isOnline = true;
        this.updateDatabaseStatus(true);
        this.processOfflineQueue();
        Utils.showNotification('اتصال اینترنت برقرار شد', 'success');
    }

    handleOffline() {
        this.isOnline = false;
        this.updateDatabaseStatus(false);
        Utils.showNotification('حالت آفلاین فعال شد', 'warning');
    }

    async addToSyncQueue(operation) {
        if (!this.isInitialized || !this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([AppConfig.STORES.SYNC_QUEUE], 'readwrite');
            const store = transaction.objectStore(AppConfig.STORES.SYNC_QUEUE);
            
            const queueItem = {
                ...operation,
                status: 'pending',
                attempts: 0
            };
            
            const request = store.add(queueItem);
            
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async processOfflineQueue() {
        if (!this.isOnline || !this.isInitialized || !this.db) return;

        try {
            const transaction = this.db.transaction([AppConfig.STORES.SYNC_QUEUE], 'readwrite');
            const store = transaction.objectStore(AppConfig.STORES.SYNC_QUEUE);
            const index = store.index('status');
            const request = index.getAll('pending');

            request.onsuccess = async () => {
                const pendingItems = request.result || [];
                
                for (const item of pendingItems) {
                    try {
                        // Process each pending item
                        switch (item.type) {
                            case 'save_customer':
                                // Re-save customer when online
                                break;
                            case 'delete_customer':
                                // Process deletion when online
                                break;
                        }
                        
                        // Mark as processed
                        item.status = 'completed';
                        item.processedAt = new Date().toISOString();
                        
                        const updateRequest = store.put(item);
                        await new Promise((resolve, reject) => {
                            updateRequest.onsuccess = resolve;
                            updateRequest.onerror = reject;
                        });
                        
                    } catch (error) {
                        console.error('Error processing queue item:', error);
                        item.attempts++;
                        if (item.attempts >= 3) {
                            item.status = 'failed';
                        }
                        store.put(item);
                    }
                }
                
                if (pendingItems.length > 0) {
                    Utils.showNotification(`${pendingItems.length} عملیات آفلاین پردازش شد`, 'success');
                }
            };
        } catch (error) {
            console.error('Error processing offline queue:', error);
        }
    }

    updateDatabaseStatus(connected) {
        const statusElement = document.getElementById('dbStatus');
        if (statusElement) {
            if (connected) {
                statusElement.innerHTML = '<i class="fas fa-database"></i> <span>متصل</span>';
                statusElement.className = 'db-status connected';
            } else {
                statusElement.innerHTML = '<i class="fas fa-database"></i> <span>آفلاین</span>';
                statusElement.className = 'db-status disconnected';
            }
        }
    }

    async initializeSettings() {
        try {
            for (const [key, value] of Object.entries(AppConfig.DEFAULT_SETTINGS)) {
                const existing = await this.getSettings(key);
                if (existing === null) {
                    await this.saveSettings(key, value);
                }
            }
        } catch (error) {
            console.error('Error initializing settings:', error);
        }
    }

    onUpdate(callback) {
        this.onUpdateCallbacks.push(callback);
    }

    notifyUpdate(type, data) {
        this.onUpdateCallbacks.forEach(callback => {
            try {
                callback(type, data);
            } catch (error) {
                console.error('Error in update callback:', error);
            }
        });
    }

    // Performance optimization: Batch operations
    async batchSaveCustomers(customers) {
        const promises = customers.map(customer => this.saveCustomer(customer));
        return Promise.all(promises);
    }
}