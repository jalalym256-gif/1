// ========== UNIQUE ID GENERATOR ==========
class IDGenerator {
    constructor() {
        this.usedIDs = new Set();
        this.initialize();
    }

    async initialize() {
        try {
            // Load existing IDs from localStorage for quick access
            const storedIDs = localStorage.getItem('alfajr_used_ids');
            if (storedIDs) {
                const ids = JSON.parse(storedIDs);
                ids.forEach(id => this.usedIDs.add(id));
            }
        } catch (error) {
            console.error('Error initializing ID generator:', error);
        }
    }

    generateUniqueFourDigitID() {
        let id;
        let attempts = 0;
        const maxAttempts = 1000; // Prevent infinite loop

        do {
            // Generate random 4-digit number (1000-9999)
            id = Math.floor(1000 + Math.random() * 9000).toString();
            attempts++;
            
            if (attempts > maxAttempts) {
                throw new Error('Cannot generate unique ID after maximum attempts');
            }
        } while (this.usedIDs.has(id) || id.length !== 4);

        this.usedIDs.add(id);
        this.saveUsedIDs();
        return id;
    }

    saveUsedIDs() {
        try {
            localStorage.setItem('alfajr_used_ids', JSON.stringify([...this.usedIDs]));
        } catch (error) {
            console.error('Error saving used IDs:', error);
        }
    }

    addUsedID(id) {
        if (id && id.toString().length === 4) {
            this.usedIDs.add(id.toString());
            this.saveUsedIDs();
        }
    }

    removeUsedID(id) {
        this.usedIDs.delete(id.toString());
        this.saveUsedIDs();
    }

    clearUsedIDs() {
        this.usedIDs.clear();
        localStorage.removeItem('alfajr_used_ids');
    }

    async syncWithDatabase(databaseManager) {
        try {
            const customers = await databaseManager.getAllCustomers(true);
            customers.forEach(customer => {
                if (customer.id && customer.id.toString().length === 4) {
                    this.usedIDs.add(customer.id.toString());
                }
            });
            this.saveUsedIDs();
        } catch (error) {
            console.error('Error syncing IDs with database:', error);
        }
    }
}

// Create global instance
const idGenerator = new IDGenerator();