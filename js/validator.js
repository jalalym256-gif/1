// ========== VALIDATOR MODULE ==========

const Validator = {
    // اعتبارسنجی مشتری
    validateCustomer(customer) {
        const errors = [];

        // نام الزامی است
        if (!customer.name || customer.name.trim() === '') {
            errors.push('نام مشتری الزامی است');
        }

        // طول نام
        if (customer.name && customer.name.length > 100) {
            errors.push('نام مشتری نباید بیشتر از 100 حرف باشد');
        }

        // شماره تماس (اختیاری ولی اگر وارد شد باید معتبر باشد)
        if (customer.phone && !/^[0-9\s\-\+()]+$/.test(customer.phone)) {
            errors.push('شماره تماس نامعتبر است');
        }

        // ایمیل (اختیاری ولی اگر وارد شد باید معتبر باشد)
        if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
            errors.push('آدرس ایمیل نامعتبر است');
        }

        // قیمت کل باید عدد مثبت باشد
        if (customer.totalPrice && isNaN(parseFloat(customer.totalPrice))) {
            errors.push('قیمت کل باید عدد باشد');
        }

        // مبلغ پرداخت شده باید عدد مثبت باشد
        if (customer.paidAmount && isNaN(parseFloat(customer.paidAmount))) {
            errors.push('مبلغ پرداخت شده باید عدد باشد');
        }

        // مبلغ پرداخت شده نباید بیشتر از کل باشد
        if (customer.paidAmount && customer.totalPrice) {
            const paid = parseFloat(customer.paidAmount);
            const total = parseFloat(customer.totalPrice);
            if (paid > total) {
                errors.push('مبلغ پرداخت شده نمی‌تواند بیشتر از قیمت کل باشد');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // اعتبارسنجی سفارش
    validateOrder(order) {
        const errors = [];

        if (!order.type || order.type.trim() === '') {
            errors.push('نوع سفارش الزامی است');
        }

        if (order.quantity && isNaN(parseInt(order.quantity))) {
            errors.push('تعداد باید عدد صحیح باشد');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // اعتبارسنجی اندازه‌گیری
    validateMeasurement(measurement) {
        const errors = [];

        if (!measurement.label || measurement.label.trim() === '') {
            errors.push('برچسب اندازه‌گیری الزامی است');
        }

        if (measurement.value && isNaN(parseFloat(measurement.value))) {
            errors.push('مقدار اندازه‌گیری باید عدد باشد');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
};