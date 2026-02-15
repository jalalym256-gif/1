// ========== PRINT FUNCTIONS ==========
function printFullTable() {
    if (currentCustomerIndex === null) {
        showNotification('لطفاً ابتدا یک مشتری انتخاب کنید', 'warning');
        return;
    }

    const customer = customers[currentCustomerIndex];
    const today = new Date();
    const persianDate = today.toLocaleDateString('fa-IR');
    const time = today.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    
    const printContent = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <title>لیبل اندازه‌گیری ALFAJR</title>
    <style>
        @page { 
            size: 76mm auto; 
            margin: 0mm; 
            padding: 0;
        }
        body { 
            width: 72mm; 
            padding: 5mm; 
            font-family: Tahoma, Arial, sans-serif; 
            font-size: 13px; 
            margin: 0 auto;
            background: white;
            color: black;
            line-height: 1.5;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        .header {
            text-align: center;
            padding: 2mm 0;
            border-bottom: 1px solid #000;
            margin-bottom: 2mm;
        }
        .shop-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 1mm;
        }
        .contact {
            font-size: 12px;
            margin-bottom: 1mm;
        }
        .customer-info {
            text-align: center;
            margin: 2mm 0;
            padding: 2mm;
        }
        .customer-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 1mm;
        }
        .customer-phone {
            font-size: 12px;
            margin-bottom: 1mm;
        }
        .customer-id {
            font-size: 12px;
            color: #000;
            font-weight: normal;
        }
        .customer-notes {
            font-size: 11px;
            margin: 2mm 0;
            padding: 1mm;
            background: #f5f5f5;
            border-radius: 1px;
        }
        .measurements-table {
            width: 100%;
            margin: 2mm 0;
            border-collapse: collapse;
            font-size: 12px;
        }
        .measurement-row {
            margin-bottom: 1mm;
            padding: 1mm 0;
        }
        .measurement-label {
            font-weight: bold;
            text-align: right;
            padding-left: 2mm;
            width: 50%;
            border-bottom: 0.5px solid #ddd;
            padding-bottom: 1mm;
        }
        .measurement-value {
            text-align: left;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            width: 50%;
            border-bottom: 0.5px solid #ddd;
            padding-bottom: 1mm;
        }
        .order-info {
            margin-top: 2mm;
            padding-top: 1mm;
            border-top: 0.5px solid #000;
            font-size: 12px;
            text-align: center;
        }
        .models-section {
            margin-top: 2mm;
            padding-top: 1mm;
            border-top: 0.5px solid #000;
            font-size: 12px;
        }
        .model-item {
            margin-bottom: 1mm;
        }
        .model-label {
            font-weight: bold;
            display: inline-block;
            width: 25mm;
        }
        .footer {
            text-align: center;
            margin-top: 2mm;
            padding-top: 1mm;
            border-top: 0.5px solid #ccc;
            font-size: 10px;
            color: #666;
        }
        @media print {
            body {
                margin: 0;
                padding: 5mm;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="shop-name">ALFAJR خیاطی</div>
        <div class="contact">۰۷۹۹۷۹۹۰۰۹</div>
    </div>
    
    <div class="customer-info">
        <div class="customer-name">${escapeHtml(customer.name || 'بدون نام')}</div>
        <div class="customer-phone">${escapeHtml(customer.phone || 'بدون شماره')}</div>
        <div class="customer-id">کد: ${escapeHtml(customer.id)}</div>
    </div>
    
    ${customer.notes && customer.notes.trim() !== '' ? `
        <div class="customer-notes">
            توضیحات: ${escapeHtml(customer.notes)}
        </div>
    ` : ''}
    
    <table class="measurements-table">
        <tr>
            <td class="measurement-label">قد:</td>
            <td class="measurement-value">${customer.measurements.قد || '-'}</td>
        </tr>
        <tr>
            <td class="measurement-label">شانه:</td>
            <td class="measurement-value">
                ${customer.measurements.شانه_یک || '-'} / ${customer.measurements.شانه_دو || '-'}
            </td>
        </tr>
        <tr>
            <td class="measurement-label">آستین:</td>
            <td class="measurement-value">
                ${customer.measurements.آستین_یک || '-'} / ${customer.measurements.آستین_دو || '-'} / ${customer.measurements.آستین_سه || '-'}
            </td>
        </tr>
        <tr>
            <td class="measurement-label">بغل:</td>
            <td class="measurement-value">${customer.measurements.بغل || '-'}</td>
        </tr>
        <tr>
            <td class="measurement-label">دامن:</td>
            <td class="measurement-value">${customer.measurements.دامن || '-'}</td>
        </tr>
        <tr>
            <td class="measurement-label">گردن:</td>
            <td class="measurement-value">${customer.measurements.گردن || '-'}</td>
        </tr>
        <tr>
            <td class="measurement-label">دور سینه:</td>
            <td class="measurement-value">${customer.measurements.دور_سینه || '-'}</td>
        </tr>
        <tr>
            <td class="measurement-label">شلوار:</td>
            <td class="measurement-value">${customer.measurements.شلوار || '-'}</td>
        </tr>
        <tr>
            <td class="measurement-label">دم پاچه:</td>
            <td class="measurement-value">${customer.measurements.دم_پاچه || '-'}</td>
        </tr>
        <tr>
            <td class="measurement-label">ب - خ:</td>
            <td class="measurement-value">
                ب: ${customer.measurements.بر_تمبان || '-'} - خ: ${customer.measurements.خشتک || '-'}
            </td>
        </tr>
        <tr>
            <td class="measurement-label">چاک:</td>
            <td class="measurement-value">${customer.measurements.چاک_پتی || '-'}</td>
        </tr>
    </table>
    
    <div class="order-info">
        تعداد سفارش: ${customer.measurements.تعداد_سفارش || '-'} - مقدار تکه: ${customer.measurements.مقدار_تکه || '-'}
    </div>
    
    <div class="models-section">
        ${customer.models.yakhun ? `
        <div class="model-item">
            <span class="model-label">یخن:</span>
            <span>${escapeHtml(customer.models.yakhun)}</span>
        </div>
        ` : ''}
        ${customer.models.sleeve ? `
        <div class="model-item">
            <span class="model-label">آستین:</span>
            <span>${escapeHtml(customer.models.sleeve)}</span>
        </div>
        ` : ''}
        ${customer.models.skirt && customer.models.skirt.length > 0 ? `
        <div class="model-item">
            <span class="model-label">دامن:</span>
            <span>${escapeHtml(customer.models.skirt.join('، '))}</span>
        </div>
        ` : ''}
        ${customer.models.features && customer.models.features.length > 0 ? `
        <div class="model-item">
            <span class="model-label">ویژگی:</span>
            <span>${escapeHtml(customer.models.features.join('، '))}</span>
        </div>
        ` : ''}
        ${customer.deliveryDay ? `
        <div class="model-item">
            <span class="model-label">تحویل:</span>
            <span>${escapeHtml(customer.deliveryDay)}</span>
        </div>
        ` : ''}
    </div>
    
    <div class="footer">
        <div>${persianDate} - ${time}</div>
        <div>سیستم مدیریت خیاطی ALFAJR</div>
    </div>
    
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() {
                    window.close();
                }, 500);
            }, 300);
        };
        window.onbeforeunload = null;
    </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=600,height=800,toolbar=no,scrollbars=no,status=no');
    if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
    } else {
        showNotification('لطفاً popup blocker را غیرفعال کنید', 'error');
    }
}

function printProfessionalInvoice() {
    if (currentCustomerIndex === null) {
        showNotification('لطفاً ابتدا یک مشتری انتخاب کنید', 'warning');
        return;
    }

    const customer = customers[currentCustomerIndex];
    const today = new Date();
    const persianDate = today.toLocaleDateString('fa-IR');
    
    const printContent = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <title>فاکتور ALFAJR</title>
    <style>
        @page { 
            size: 76mm auto; 
            margin: 0mm; 
            padding: 0;
        }
        body { 
            width: 72mm; 
            padding: 5mm; 
            font-family: Tahoma, Arial, sans-serif; 
            font-size: 14px; 
            margin: 0 auto;
            background: white;
            color: black;
            line-height: 1.5;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        .invoice {
            padding: 3mm;
        }
        .header {
            text-align: center;
            padding-bottom: 2mm;
            margin-bottom: 3mm;
        }
        .logo {
            font-size: 18px;
            font-weight: bold;
            color: #000;
            margin-bottom: 1mm;
        }
        .contact {
            font-size: 12px;
        }
        .customer-info {
            margin: 3mm 0;
            padding: 2mm;
            background: #f5f5f5;
            border-radius: 1px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1mm;
            font-size: 12px;
        }
        .info-label {
            font-weight: bold;
            min-width: 20mm;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin: 3mm 0;
        }
        .details-table td {
            padding: 1.5mm;
            vertical-align: middle;
        }
        .col-label {
            width: 30%;
            background: #f8f8f8;
            font-weight: bold;
        }
        .col-value {
            width: 70%;
        }
        .price-section {
            text-align: center;
            margin: 3mm 0;
            padding: 2mm;
            border: 1px solid #000;
            border-radius: 1px;
        }
        .price-label {
            font-size: 13px;
            font-weight: bold;
        }
        .price-amount {
            font-size: 16px;
            font-weight: bold;
            color: #000;
            margin-top: 2mm;
        }
        .thank-you {
            text-align: center;
            margin-top: 3mm;
            padding: 2mm;
            border-top: 0.5px solid #000;
            font-size: 11px;
            color: #000;
        }
        .brand {
            font-weight: bold;
            font-size: 12px;
        }
        @media print {
            body {
                margin: 0;
                padding: 5mm;
            }
        }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <div class="logo">ALFAJR خیاطی</div>
            <div class="contact">۰۷۹۹۷۹۹۰۰۹</div>
        </div>
        
        <div class="customer-info">
            <div class="info-row">
                <span class="info-label">مشتری:</span>
                <span class="info-value">${escapeHtml(customer.name || 'بدون نام')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">تلفن:</span>
                <span class="info-value">${escapeHtml(customer.phone || 'بدون شماره')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">کد مشتری:</span>
                <span class="info-value">${escapeHtml(customer.id)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">تاریخ:</span>
                <span class="info-value">${persianDate}</span>
            </div>
        </div>
        
        <table class="details-table">
            <tr>
                <td class="col-label">مدل یخن</td>
                <td class="col-value">${escapeHtml(customer.models.yakhun || '-')}</td>
            </tr>
            <tr>
                <td class="col-label">تاریخ تحویل</td>
                <td class="col-value">${escapeHtml(customer.deliveryDay || '-')}</td>
            </tr>
        </table>
        
        ${customer.sewingPriceAfghani ? `
        <div class="price-section">
            <div class="price-label">مبلغ قابل پرداخت</div>
            <div class="price-amount">${formatPrice(customer.sewingPriceAfghani)} ${currentCurrency}</div>
            ${customer.paymentReceived ? 
                '<div style="color: green; font-size: 11px; margin-top: 1mm;">پرداخت شده</div>' : 
                '<div style="color: red; font-size: 11px; margin-top: 1mm;">پرداخت نشده</div>'}
        </div>
        ` : ''}
        
        <div class="thank-you">
            <div>با تشکر از انتخاب شما</div>
            <div class="brand">برند الفجر</div>
        </div>
    </div>
    
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() {
                    window.close();
                }, 500);
            }, 300);
        };
        window.onbeforeunload = null;
    </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=600,height=800,toolbar=no,scrollbars=no,status=no');
    if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
    } else {
        showNotification('لطفاً popup blocker را غیرفعال کنید', 'error');
    }
}

function addPrintButtons() {
    const printContainer = document.getElementById('printButtonsContainer');
    if (printContainer) {
        printContainer.innerHTML = `
            <button class="btn-primary" onclick="printFullTable()">
                <i class="fas fa-print"></i>
                چاپ لیبل اندازه
            </button>
            <button class="btn-secondary" onclick="printProfessionalInvoice()">
                <i class="fas fa-file-invoice"></i>
                چاپ فاکتور
            </button>
        `;
    }
}