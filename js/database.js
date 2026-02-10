// ========== DATABASE MANAGER ==========
class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.onUpdateCallbacks = [];
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
                this.initializeSettings();
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(AppConfig.STORES.CUSTOMERS)) {
                    const store = db.createObjectStore(AppConfig.STORES.CUSTOMERS, { keyPath: 'id' });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('phone', 'phone', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(AppConfig.STORES.SETTINGS)) {
                    db.createObjectStore(AppConfig.STORES.SETTINGS, { keyPath: 'key' });
                }
                
                if (!db.objectStoreNames.contains(AppConfig.STORES.BACKUP)) {
                    const backupStore = db.createObjectStore(AppConfig.STORES.BACKUP, { keyPath: 'id', autoIncrement: true });
                    backupStore.createIndex('date', 'date', { unique: false });
                }
            };
        });
    }

    onUpdate(callback) {
        this.onUpdateCallbacks.push(callback);
    }

    notifyUpdate(type, data) {
        this.onUpdateCallbacks.forEach(callback => {
            try {
                callback(type, data);
            } catch (error) {}
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

    async initializeSettings() {
        try {
            for (const [key, value] of Object.entries(AppConfig.DEFAULT_SETTINGS)) {
                const existing = await this.getSettings(key);
                if (existing === null) {
                    await this.saveSettings(key, value);
                }
            }
        } catch (error) {}
    }

    async saveCustomer(customer) {
        return new Promise((resolve, reject) => {
            if (!this.isInitialized || !this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            if (!customer || !customer.id) {
                reject(new Error('Invalid customer data'));
                return;
            }
            
            const errors = customer.validate();
            if (errors.length > 0) {
                reject(new Error(errors.join('\n')));
                return;
            }
            
            customer.updatedAt = new Date().toISOString();
            const customerData = customer.toObject();
            
            const transaction = this.db.transaction([AppConfig.STORES.CUSTOMERS], 'readwrite');
            const store = transaction.objectStore(AppConfig.STORES.CUSTOMERS);
            
            const request = store.put(customerData);
            
            request.onsuccess = () => {
                this.notifyUpdate('customer_saved', customer);
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
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
}