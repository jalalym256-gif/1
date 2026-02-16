// ========== PRINT FUNCTIONS ==========
function printFullTable() {
    if (currentCustomerIndex === null) {
        showNotification('لطفاً ابتدا یک مشتری انتخاب کنید', 'warning');
        return;
    }

    const customer = customers[currentCustomerIndex];
    const today = new Date();
    const persianDate = today.toLocaleDateString('fa-IR');
    const persianTime = today.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const m  = customer.measurements || {};
    const v  = (field) => m[field] !== undefined && m[field] !== '' ? m[field] : '';

    // مدل‌ها
    const yakhun   = customer.models?.yakhun   || '';
    const sleeve   = customer.models?.sleeve   || '';
    const skirt    = Array.isArray(customer.models?.skirt)    ? customer.models.skirt.join(' / ')    : '';
    const features = Array.isArray(customer.models?.features) ? customer.models.features.join(' / ') : '';
    const modelText = [yakhun, sleeve, skirt, features].filter(Boolean).join('\n');

    const noteType = customer.notes ? customer.notes.substring(0, 20) : '';

    const printContent = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <title>لیبل ALFAJR</title>
    <style>
        @page { size: 76mm auto; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            width: 76mm;
            font-family: Tahoma, Arial, sans-serif;
            font-size: 10.5px;
            background: white;
            color: #000;
            padding: 1.5mm 2mm;
        }

        /* ===== هدر ===== */
        .hdr {
            border: 1.5px solid #000;
            margin-bottom: 1mm;
        }
        .hdr-r1, .hdr-r2 {
            display: flex;
            justify-content: space-between;
            padding: 0.8mm 2mm;
            font-size: 10.5px;
        }
        .hdr-r1 { border-bottom: 1px solid #000; }
        .bold { font-weight: bold; }

        /* ===== جدول اصلی ===== */
        .main {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000;
        }
        .main td {
            border: 1px solid #000;
            padding: 0;
            vertical-align: top;
        }

        /* ستون مدل - چپ */
        .col-model {
            width: 26mm;
            padding: 1.5mm;
        }
        .model-title {
            font-weight: bold;
            font-size: 11px;
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 1mm;
            margin-bottom: 1.5mm;
        }
        .model-body {
            font-size: 10px;
            line-height: 2;
            white-space: pre-line;
        }

        /* ستون اندازه‌ها - راست */
        .col-meas { width: 50mm; padding: 0; }

        /* جدول داخلی اندازه‌ها */
        .mt {
            width: 100%;
            border-collapse: collapse;
        }
        .mt td {
            border: none;
            border-bottom: 0.5px solid #bbb;
            padding: 1mm 1.5mm;
            font-size: 10.5px;
        }
        .mt tr:last-child td { border-bottom: none; }

        .lbl {
            font-weight: bold;
            width: 14mm;
            white-space: nowrap;
        }
        .val {
            text-align: center;
            border-right: 0.5px solid #bbb !important;
            min-width: 9mm;
            font-weight: bold;
        }

        /* ردیف پایین */
        .footer-row td {
            border-top: 1.5px solid #000 !important;
            padding: 1mm 1.5mm;
            font-size: 10px;
        }
        .footer-lbl { font-weight: bold; width: 18mm; }
    </style>
</head>
<body>

    <!-- هدر -->
    <div class="hdr">
        <div class="hdr-r1">
            <span class="bold">کد: ${escapeHtml(customer.id)}</span>
            <span>نام: <span class="bold">${escapeHtml(customer.name || '')}</span></span>
        </div>
        <div class="hdr-r2">
            <span>تاریخ: ${persianDate} - ${persianTime}</span>
            <span>شماره: <span class="bold">${escapeHtml(customer.phone || '')}</span></span>
        </div>
    </div>

    <!-- جدول اصلی -->
    <table class="main">
        <tr>
            <!-- اندازه‌ها - راست -->
            <td class="col-meas">
                <table class="mt">
                    <tr>
                        <td class="lbl">قد</td>
                        <td class="val" colspan="3">${v('قد')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">شانه</td>
                        <td class="val">${v('شانه_یک')}</td>
                        <td class="val" colspan="2">${v('شانه_دو')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">آستین</td>
                        <td class="val">${v('آستین_یک')}</td>
                        <td class="val">${v('آستین_دو')}</td>
                        <td class="val">${v('آستین_سه')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">بغل</td>
                        <td class="val" colspan="3">${v('بغل')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">دامن</td>
                        <td class="val" colspan="3">${v('دامن')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">گردن</td>
                        <td class="val" colspan="3">${v('گردن')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">شلوار</td>
                        <td class="val" colspan="3">${v('شلوار')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">پاچه</td>
                        <td class="val" colspan="3">${v('دم_پاچه')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">ب</td>
                        <td class="val">${v('بر_تمبان')}</td>
                        <td class="lbl" style="border-right:0.5px solid #bbb">خ</td>
                        <td class="val">${v('خشتک')}</td>
                    </tr>
                    <tr>
                        <td class="lbl">چاک پتی</td>
                        <td class="val">${v('چاک_پتی')}</td>
                        <td class="lbl" style="border-right:0.5px solid #bbb">زیربقل</td>
                        <td class="val">${v('دور_سینه')}</td>
                    </tr>
                </table>
            </td>

            <!-- مدل - چپ -->
            <td class="col-model">
                <div class="model-title">مدل</div>
                <div class="model-body">${escapeHtml(modelText || '—')}</div>
            </td>
        </tr>

        <!-- ردیف پایین: تعداد سفارش / زیربقل / مقدار -->
        <tr class="footer-row">
            <td colspan="2">
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td class="footer-lbl">تعداد سفارش</td>
                        <td style="border-right:0.5px solid #bbb;border-left:0.5px solid #bbb;padding:0 2mm;min-width:8mm;text-align:center;font-weight:bold;">${v('تعداد_سفارش')}</td>
                        <td class="footer-lbl" style="padding-right:2mm;">مقدار تکه</td>
                        <td style="padding:0 2mm;min-width:8mm;text-align:center;font-weight:bold;">${v('مقدار_تکه')}</td>
                    </tr>
                </table>
            </td>
        </tr>

        ${customer.sewingPriceAfghani || customer.deliveryDay ? `
        <tr class="footer-row">
            <td colspan="2" style="padding:1mm 2mm;">
                ${customer.sewingPriceAfghani ? `قیمت: <strong>${formatPrice(customer.sewingPriceAfghani)} ${currentCurrency}</strong>` : ''}
                ${customer.sewingPriceAfghani && customer.deliveryDay ? '&nbsp;&nbsp;&nbsp;' : ''}
                ${customer.deliveryDay ? `تحویل: <strong>${escapeHtml(customer.deliveryDay)}</strong>` : ''}
                ${customer.paymentReceived ? '&nbsp;&nbsp;&nbsp;<strong>✓ پرداخت شده</strong>' : ''}
            </td>
        </tr>
        ` : ''}
    </table>

</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) {
        showNotification('لطفاً popup را در مرورگر مجاز کنید', 'warning');
        return;
    }
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
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