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

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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
        
        AppConfig.MEASUREMENT_FIELDS.forEach(field => {
            const value = this.measurements[field];
            if (value && isNaN(parseFloat(value))) {
                errors.push(`فیلد ${field} باید عددی باشد`);
            }
        });
        
        if (this.sewingPriceAfghani && isNaN(parseInt(this.sewingPriceAfghani))) {
            errors.push('قیمت باید عددی باشد');
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
        
        if (!Array.isArray(customer.orders)) customer.orders = [];
        if (!customer.models) customer.models = { yakhun: "", sleeve: "", skirt: [], features: [] };
        if (!Array.isArray(customer.models.skirt)) customer.models.skirt = [];
        if (!Array.isArray(customer.models.features)) customer.models.features = [];
        if (!customer.measurements) customer.measurements = customer.createEmptyMeasurements();
        
        AppConfig.MEASUREMENT_FIELDS.forEach(field => {
            if (customer.measurements[field] && typeof customer.measurements[field] === 'string') {
                const numValue = parseFloat(customer.measurements[field]);
                if (!isNaN(numValue)) {
                    customer.measurements[field] = numValue;
                }
            }
        });
        
        if (customer.sewingPriceAfghani && typeof customer.sewingPriceAfghani === 'string') {
            const priceValue = parseInt(customer.sewingPriceAfghani);
            if (!isNaN(priceValue)) {
                customer.sewingPriceAfghani = priceValue;
            }
        }
        
        return customer;
    }
}