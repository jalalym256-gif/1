// ========== UTILITY FUNCTIONS ==========

class Utils {
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static debounce(func, wait, immediate = false) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            
            if (callNow) func.apply(context, args);
        };
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('fa-IR');
    }

    static formatPrice(price) {
        if (!price) return '۰';
        return parseInt(price).toLocaleString('fa-IR');
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    static validatePhone(phone) {
        if (!phone) return true;
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
    }

    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    }

    static hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }
}

// ========== VALIDATOR CLASS ==========
class Validator {
    static validateCustomer(customer) {
        const errors = [];
        
        if (!customer.name || customer.name.trim().length < 2) {
            errors.push('نام باید حداقل ۲ کاراکتر داشته باشد');
        }
        
        if (customer.name && customer.name.length > 100) {
            errors.push('نام نمی‌تواند بیش از ۱۰۰ کاراکتر باشد');
        }
        
        if (customer.phone && !Utils.validatePhone(customer.phone)) {
            errors.push('شماره تماس معتبر نیست');
        }
        
        if (customer.totalPrice) {
            const price = parseFloat(customer.totalPrice);
            if (isNaN(price) || price < 0) {
                errors.push('قیمت باید عدد مثبت باشد');
            }
            if (price > 1000000000) {
                errors.push('قیمت بیش از حد مجاز است');
            }
        }
        
        if (customer.paidAmount) {
            const paid = parseFloat(customer.paidAmount);
            if (isNaN(paid) || paid < 0) {
                errors.push('مبلغ پرداختی باید عدد مثبت باشد');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// ========== CUSTOMER FACTORY ==========
class CustomerFactory {
    static createNewCustomer() {
        const now = new Date();
        return {
            id: Utils.generateId(),
            name: 'مشتری جدید',
            phone: '',
            notes: '',
            measurements: [],
            models: [],
            orders: [],
            totalPrice: 0,
            paidAmount: 0,
            deliveryDate: '',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };
    }
}
