// ========== ALFAJR - PROFILE FUNCTIONS ==========
// js/profile.js — توابع صفحه پروفایل مشتری
// این فایل باید قبل از main.js و بعد از config.js بارگذاری شود

// ========== برچسب‌های فارسی اندازه‌ها ==========
const MEASUREMENT_LABELS = {
    "قد":           "قد",
    "شانه_یک":      "شانه ۱",
    "شانه_دو":      "شانه ۲",
    "آستین_یک":     "آستین ۱",
    "آستین_دو":     "آستین ۲",
    "آستین_سه":     "آستین ۳",
    "بغل":          "بغل",
    "دامن":         "دامن",
    "گردن":         "گردن",
    "دور_سینه":     "دور سینه",
    "شلوار":        "شلوار",
    "دم_پاچه":      "دم پاچه",
    "بر_تمبان":     "بر تمبان",
    "خشتک":         "خشتک",
    "چاک_پتی":      "چاک پتی",
    "تعداد_سفارش":  "تعداد سفارش",
    "مقدار_تکه":    "مقدار تکه"
};

// گروه‌بندی اندازه‌ها
const MEASUREMENT_GROUPS = [
    {
        title: "بالاتنه",
        icon: "fa-user",
        fields: ["قد", "شانه_یک", "شانه_دو", "بغل", "گردن", "دور_سینه"]
    },
    {
        title: "آستین",
        icon: "fa-hand-paper",
        fields: ["آستین_یک", "آستین_دو", "آستین_سه"]
    },
    {
        title: "پایین‌تنه",
        icon: "fa-male",
        fields: ["دامن", "شلوار", "دم_پاچه", "بر_تمبان", "خشتک", "چاک_پتی"]
    },
    {
        title: "سفارش",
        icon: "fa-list-ol",
        fields: ["تعداد_سفارش", "مقدار_تکه"]
    }
];


// ==========================================
// ۱. رندر اندازه‌گیری‌ها
// ==========================================
function renderMeasurements() {
    const container = document.getElementById('measurementsContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    let html = `
        <div class="section-header">
            <h3><i class="fas fa-ruler"></i> اندازه‌های بدن</h3>
        </div>
        <div class="measurements-grid">
    `;

    MEASUREMENT_GROUPS.forEach(group => {
        html += `
            <div class="measurement-group">
                <h4><i class="fas ${group.icon}"></i> ${group.title}</h4>
                <div class="measurement-fields">
        `;

        group.fields.forEach(field => {
            const label = MEASUREMENT_LABELS[field] || field.replace(/_/g, ' ');
            const value  = customer.measurements[field] ?? '';
            html += `
                <div class="measurement-field">
                    <label>${label}</label>
                    <input
                        type="number"
                        class="measurement-input"
                        data-field="${field}"
                        value="${value}"
                        placeholder="--"
                        step="0.5"
                        min="0"
                        oninput="updateMeasurement('${field}', this.value)"
                        onkeydown="handleMeasurementKeydown(event)"
                    >
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}


// ==========================================
// ۲. بروزرسانی یک اندازه
// ==========================================
function updateMeasurement(field, value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    customer.measurements[field] = value !== '' ? parseFloat(value) : '';
    saveCustomer();
}


// ==========================================
// ۳. ناوبری کیبورد در اندازه‌گیری‌ها
// ==========================================
function handleMeasurementKeydown(event) {
    if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;

    const inputs   = Array.from(document.querySelectorAll('.measurement-input'));
    const current  = inputs.indexOf(event.target);

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (current > 0) { inputs[current - 1].focus(); inputs[current - 1].select(); }
    } else {
        // Enter یا ArrowDown
        event.preventDefault();
        if (current < inputs.length - 1) { inputs[current + 1].focus(); inputs[current + 1].select(); }
    }
}


// ==========================================
// ۴. رندر مدل‌ها
// ==========================================
function renderModels() {
    const container = document.getElementById('modelsContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    const selYakhun  = customer.models.yakhun    || '';
    const selSleeve  = customer.models.sleeve    || '';
    const selSkirt   = customer.models.skirt     || [];
    const selFeature = customer.models.features  || [];

    // تابع کمکی برای دکمه‌های تک‌انتخابی
    const singleBtn = (type, model, selected) => `
        <button class="model-option ${selected ? 'selected' : ''}" onclick="selectModel('${type}', '${model}')">
            ${escapeHtml(model)}
        </button>
    `;

    // تابع کمکی برای دکمه‌های چندانتخابی
    const multiBtn = (type, model, selected) => `
        <button class="model-option multi-select ${selected ? 'selected' : ''}" onclick="toggleMultiSelect('${type}', '${model}')">
            ${selected ? '<span class="checkmark">✓</span>' : ''}
            ${escapeHtml(model)}
        </button>
    `;

    let html = `
        <div class="section-header">
            <h3><i class="fas fa-tshirt"></i> مدل‌ها و ویژگی‌ها</h3>
        </div>
        <div class="models-grid">

            <div class="model-category">
                <h4><i class="fas fa-cut"></i> مدل یخن</h4>
                <div class="model-options">
                    ${AppConfig.YAKHUN_MODELS.map(m => singleBtn('yakhun', m, selYakhun === m)).join('')}
                </div>
            </div>

            <div class="model-category">
                <h4><i class="fas fa-hand-paper"></i> مدل آستین</h4>
                <div class="model-options">
                    ${AppConfig.SLEEVE_MODELS.map(m => singleBtn('sleeve', m, selSleeve === m)).join('')}
                </div>
            </div>

            <div class="model-category">
                <h4><i class="fas fa-star"></i> مدل دامن <span style="font-size:0.8rem;opacity:0.7">(چندتایی)</span></h4>
                <div class="model-options">
                    ${AppConfig.SKIRT_MODELS.map(m => multiBtn('skirt', m, selSkirt.includes(m))).join('')}
                </div>
            </div>

            <div class="model-category">
                <h4><i class="fas fa-plus-circle"></i> ویژگی‌های اضافه <span style="font-size:0.8rem;opacity:0.7">(چندتایی)</span></h4>
                <div class="model-options">
                    ${AppConfig.FEATURES_LIST.map(m => multiBtn('features', m, selFeature.includes(m))).join('')}
                </div>
            </div>

        </div>
    `;

    container.innerHTML = html;
}


// ==========================================
// ۵. انتخاب مدل تک‌انتخابی
// ==========================================
function selectModel(type, value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    // اگر همون مدل بود، deselect کن
    customer.models[type] = customer.models[type] === value ? '' : value;

    renderModels();
    saveCustomer();
}


// ==========================================
// ۶. تغییر وضعیت مدل چندانتخابی
// ==========================================
function toggleMultiSelect(type, value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    if (!Array.isArray(customer.models[type])) customer.models[type] = [];

    const idx = customer.models[type].indexOf(value);
    if (idx === -1) {
        customer.models[type].push(value);
    } else {
        customer.models[type].splice(idx, 1);
    }

    renderModels();
    saveCustomer();
}


// ==========================================
// ۷. رندر قیمت و تحویل
// ==========================================
function renderPriceDelivery() {
    const container = document.getElementById('priceDeliveryContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer   = customers[currentCustomerIndex];
    if (!customer) return;

    const price      = customer.sewingPriceAfghani || '';
    const isPaid     = customer.paymentReceived    || false;
    const payDate    = customer.paymentDate        || null;
    const delivery   = customer.deliveryDay        || '';

    const payLabel   = isPaid ? 'پرداخت شده ✓' : 'پرداخت نشده ✗';
    const payClass   = isPaid ? 'checked' : '';

    let html = `
        <div class="section-header">
            <h3><i class="fas fa-money-bill-wave"></i> قیمت و تحویل</h3>
        </div>
        <div class="price-delivery-grid">

            <!-- قیمت دوخت -->
            <div class="price-section">
                <h4><i class="fas fa-coins"></i> قیمت دوخت</h4>
                <div class="price-input-group">
                    <input
                        type="number"
                        id="sewingPrice"
                        value="${price}"
                        placeholder="مبلغ به ${currentCurrency}..."
                        min="0"
                        oninput="updatePrice(this.value)"
                    >
                    <span class="currency">${currentCurrency}</span>
                </div>
                ${price ? `<div style="margin-top:12px;color:#28a745;font-size:1.1rem;font-weight:bold;">${formatPrice(price)} ${currentCurrency}</div>` : ''}
            </div>

            <!-- وضعیت پرداخت -->
            <div class="payment-section">
                <h4><i class="fas fa-credit-card"></i> وضعیت پرداخت</h4>
                <div class="payment-toggle" onclick="togglePayment()">
                    <div class="payment-checkbox ${payClass}">
                        <div class="checkbox-icon">${isPaid ? '✓' : ''}</div>
                        <span>${payLabel}</span>
                    </div>
                    ${isPaid && payDate ? `<div class="payment-date"><i class="fas fa-calendar-check"></i> ${formatDate(payDate)}</div>` : ''}
                </div>
            </div>

            <!-- روز تحویل -->
            <div class="delivery-section">
                <h4><i class="fas fa-calendar-alt"></i> روز تحویل</h4>
                <div class="delivery-days">
                    ${AppConfig.DAYS_OF_WEEK.map(day => `
                        <button
                            class="day-button ${delivery === day ? 'selected' : ''}"
                            onclick="setDeliveryDay('${day}')"
                        >${day}</button>
                    `).join('')}
                </div>
            </div>

        </div>
    `;

    container.innerHTML = html;
}


// ==========================================
// ۸. بروزرسانی قیمت
// ==========================================
function updatePrice(value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    customer.sewingPriceAfghani = value ? parseInt(value) : null;

    // فقط نمایش قیمت فارسی رو آپدیت کن بدون re-render کامل
    const priceSection = document.querySelector('#priceDeliveryContainer .price-section');
    if (priceSection) {
        let display = priceSection.querySelector('.price-display-live');
        if (!display) {
            display = document.createElement('div');
            display.className = 'price-display-live';
            display.style.cssText = 'margin-top:12px;color:#28a745;font-size:1.1rem;font-weight:bold;';
            priceSection.appendChild(display);
        }
        display.textContent = value && parseInt(value) > 0 ? `${formatPrice(value)} ${currentCurrency}` : '';
    }

    saveCustomer();
}


// ==========================================
// ۹. تغییر وضعیت پرداخت
// ==========================================
function togglePayment() {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    customer.paymentReceived = !customer.paymentReceived;
    customer.paymentDate     = customer.paymentReceived ? new Date().toISOString() : null;

    renderPriceDelivery();
    saveCustomer();

    showNotification(
        customer.paymentReceived ? '✓ وضعیت پرداخت: پرداخت شده' : '✗ وضعیت پرداخت: پرداخت نشده',
        customer.paymentReceived ? 'success' : 'warning'
    );
}


// ==========================================
// ۱۰. تنظیم روز تحویل
// ==========================================
function setDeliveryDay(day) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    // کلیک دوباره = پاک کردن
    customer.deliveryDay = customer.deliveryDay === day ? '' : day;

    // آپدیت سریع دکمه‌ها بدون re-render کامل
    document.querySelectorAll('.day-button').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent.trim() === customer.deliveryDay);
    });

    saveCustomer();
}


// ==========================================
// ۱۱. رندر سفارشات
// ==========================================
function renderOrders() {
    const container = document.getElementById('ordersContainer');
    if (!container || currentCustomerIndex === null) return;

    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    const orders = customer.orders || [];

    let ordersHtml = '';

    if (orders.length === 0) {
        ordersHtml = `
            <div class="empty-orders">
                <i class="fas fa-clipboard"></i>
                <p>هنوز سفارشی ثبت نشده است</p>
            </div>
        `;
    } else {
        ordersHtml = orders.map((order, idx) => {
            const dateStr  = order.date ? new Date(order.date).toLocaleDateString('fa-IR') : '';
            const isDone   = order.status === 'done';
            const statusClass = isDone ? 'color:#28a745' : 'color:#ffc107';
            const statusIcon  = isDone ? 'fa-check-circle' : 'fa-clock';
            const statusLabel = isDone ? 'تحویل داده شد' : 'در دست تهیه';

            return `
                <div class="order-item">
                    <div class="order-content">
                        <div class="order-header">
                            <span class="order-number">سفارش ${idx + 1}</span>
                            <span class="order-date">${dateStr}</span>
                        </div>
                        <div class="order-details">
                            <textarea
                                style="width:100%;min-height:80px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;color:#C0C0C0;font-size:1rem;resize:vertical;"
                                placeholder="توضیحات سفارش را اینجا وارد کنید..."
                                onchange="updateOrderDescription(${idx}, this.value)"
                            >${escapeHtml(order.description || '')}</textarea>
                            <div style="margin-top:10px;">
                                <button
                                    style="${statusClass};background:rgba(255,255,255,0.05);border:1px solid currentColor;border-radius:20px;padding:8px 18px;font-size:0.9rem;cursor:pointer;"
                                    onclick="toggleOrderStatus(${idx})"
                                >
                                    <i class="fas ${statusIcon}"></i> ${statusLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                    <button class="btn-delete-order" onclick="deleteOrder(${idx})" title="حذف سفارش">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    let html = `
        <div class="section-header">
            <h3><i class="fas fa-clipboard-list"></i> سفارشات
                <span style="background:rgba(108,117,125,0.3);color:#C0C0C0;border-radius:20px;padding:3px 12px;font-size:0.9rem;margin-right:10px;">${orders.length}</span>
            </h3>
        </div>
        <div class="orders-list">
            ${ordersHtml}
        </div>
        <div style="margin-top:20px;text-align:center;">
            <button class="btn-success btn-add-order" onclick="addOrder()">
                <i class="fas fa-plus"></i>
                افزودن سفارش جدید
            </button>
        </div>
    `;

    container.innerHTML = html;
}


// ==========================================
// ۱۲. افزودن سفارش جدید
// ==========================================
function addOrder() {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer) return;

    if (!Array.isArray(customer.orders)) customer.orders = [];

    customer.orders.push({
        id:          Date.now().toString(),
        description: '',
        date:        new Date().toISOString(),
        status:      'pending'
    });

    renderOrders();
    saveCustomer();

    showNotification('سفارش جدید اضافه شد', 'success');

    // فوکوس روی textarea سفارش جدید
    setTimeout(() => {
        const areas = document.querySelectorAll('#ordersContainer textarea');
        if (areas.length) areas[areas.length - 1].focus();
    }, 100);
}


// ==========================================
// ۱۳. حذف سفارش
// ==========================================
function deleteOrder(index) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer || !customer.orders) return;

    if (!confirm(`آیا از حذف سفارش ${index + 1} مطمئن هستید؟`)) return;

    customer.orders.splice(index, 1);
    renderOrders();
    saveCustomer();

    showNotification('سفارش حذف شد', 'success');
}


// ==========================================
// توابع کمکی سفارشات
// ==========================================
function updateOrderDescription(index, value) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer || !customer.orders?.[index]) return;

    customer.orders[index].description = value;
    saveCustomer();
}

function toggleOrderStatus(index) {
    if (currentCustomerIndex === null) return;
    const customer = customers[currentCustomerIndex];
    if (!customer || !customer.orders?.[index]) return;

    customer.orders[index].status = customer.orders[index].status === 'done' ? 'pending' : 'done';
    renderOrders();
    saveCustomer();
}


// ==========================================
// Export به window
// ==========================================
window.renderMeasurements      = renderMeasurements;
window.renderModels            = renderModels;
window.renderPriceDelivery     = renderPriceDelivery;
window.renderOrders            = renderOrders;
window.updateMeasurement       = updateMeasurement;
window.handleMeasurementKeydown = handleMeasurementKeydown;
window.selectModel             = selectModel;
window.toggleMultiSelect       = toggleMultiSelect;
window.updatePrice             = updatePrice;
window.togglePayment           = togglePayment;
window.setDeliveryDay          = setDeliveryDay;
window.addOrder                = addOrder;
window.deleteOrder             = deleteOrder;
window.updateOrderDescription  = updateOrderDescription;
window.toggleOrderStatus       = toggleOrderStatus;
