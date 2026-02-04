// ========== PRINT MANAGER ==========

class PrintManager {
    static printMeasurementLabel(customer) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('لطفاً اجازه باز کردن پنجره جدید را بدهید');
            return;
        }
        
        const content = this.generateMeasurementLabelHTML(customer);
        printWindow.document.write(content);
        printWindow.document.close();
        
        printWindow.onload = () => {
            printWindow.print();
            printWindow.onafterprint = () => {
                printWindow.close();
            };
        };
    }
    
    static printInvoice(customer) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('لطفاً اجازه باز کردن پنجره جدید را بدهید');
            return;
        }
        
        const content = this.generateInvoiceHTML(customer);
        printWindow.document.write(content);
        printWindow.document.close();
        
        printWindow.onload = () => {
            printWindow.print();
            printWindow.onafterprint = () => {
                printWindow.close();
            };
        };
    }
    
    static generateMeasurementLabelHTML(customer) {
        const date = new Date().toLocaleDateString('fa-IR');
        
        return `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>لیبل اندازه‌گیری - ${customer.name}</title>
                <style>
                    body { font-family: Tahoma, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { color: #D4AF37; }
                    .customer-info { background: #f9f9f9; padding: 15px; margin-bottom: 20px; }
                    .measurements { width: 100%; border-collapse: collapse; }
                    .measurements th { background: #D4AF37; color: white; padding: 10px; }
                    .measurements td { padding: 8px; border: 1px solid #ddd; text-align: center; }
                    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📐 لیبل اندازه‌گیری</h1>
                    <p>ALFAJR خیاطی - ${date}</p>
                </div>
                
                <div class="customer-info">
                    <p><strong>نام:</strong> ${customer.name}</p>
                    <p><strong>تلفن:</strong> ${customer.phone || 'ثبت نشده'}</p>
                    <p><strong>کد پیگیری:</strong> ${customer.id}</p>
                </div>
                
                <table class="measurements">
                    <thead>
                        <tr>
                            <th>ردیف</th>
                            <th>اندازه</th>
                            <th>مقدار</th>
                            <th>توضیح</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(customer.measurements || []).map((m, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${m.label}</td>
                                <td>${m.value || ''}</td>
                                <td>${m.note || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>تاریخ: ${date} | شماره تماس: ${customer.phone || 'ثبت نشده'}</p>
                    <p class="no-print">برای چاپ از Ctrl+P استفاده کنید</p>
                </div>
            </body>
            </html>
        `;
    }
    
    static generateInvoiceHTML(customer) {
        const date = new Date().toLocaleDateString('fa-IR');
        const total = parseFloat(customer.totalPrice || 0);
        const paid = parseFloat(customer.paidAmount || 0);
        const remaining = total - paid;
        
        return `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>فاکتور - ${customer.name}</title>
                <style>
                    body { font-family: Tahoma, sans-serif; padding: 20px; }
                    .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .shop-info { flex: 1; }
                    .invoice-details { background: #f9f9f9; padding: 15px; }
                    .customer-info { background: #f0f0f0; padding: 15px; margin: 20px 0; }
                    .summary { background: #f9f9f9; padding: 20px; margin: 20px 0; }
                    .summary-item { display: flex; justify-content: space-between; margin: 10px 0; }
                    .total { font-weight: bold; font-size: 18px; }
                    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="invoice-header">
                    <div class="shop-info">
                        <h1 style="color: #D4AF37;">ALFAJR خیاطی</h1>
                        <p>سیستم مدیریت حرفه‌ای</p>
                    </div>
                    <div class="invoice-details">
                        <h3>فاکتور فروش</h3>
                        <p>شماره: ${customer.id}</p>
                        <p>تاریخ: ${date}</p>
                    </div>
                </div>
                
                <div class="customer-info">
                    <h3>مشخصات مشتری</h3>
                    <p><strong>نام:</strong> ${customer.name}</p>
                    <p><strong>تلفن:</strong> ${customer.phone || 'ثبت نشده'}</p>
                    <p><strong>تاریخ ثبت:</strong> ${new Date(customer.createdAt).toLocaleDateString('fa-IR')}</p>
                    ${customer.deliveryDate ? `<p><strong>تاریخ تحویل:</strong> ${customer.deliveryDate}</p>` : ''}
                </div>
                
                ${customer.orders && customer.orders.length > 0 ? `
                    <div style="margin: 20px 0;">
                        <h3>سفارشات</h3>
                        <ul>
                            ${customer.orders.map(order => `
                                <li>${order.type} - تعداد: ${order.quantity} - رنگ: ${order.color || 'تعیین نشده'}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="summary">
                    <h3>خلاصه مالی</h3>
                    <div class="summary-item">
                        <span>مبلغ کل:</span>
                        <span>${total.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <div class="summary-item">
                        <span>پرداخت شده:</span>
                        <span>${paid.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <div class="summary-item total">
                        <span>مانده:</span>
                        <span>${remaining.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <div style="margin-top: 20px; padding: 10px; background: ${remaining <= 0 ? '#d4edda' : '#f8d7da'};">
                        <strong>وضعیت:</strong> ${remaining <= 0 ? '✅ پرداخت کامل' : '❌ باقیمانده دارد'}
                    </div>
                </div>
                
                ${customer.notes ? `
                    <div style="margin: 20px 0; padding: 15px; background: #fff3cd;">
                        <h4>توضیحات:</h4>
                        <p>${customer.notes}</p>
                    </div>
                ` : ''}
                
                <div class="footer">
                    <p>با تشکر از اعتماد شما - ALFAJR خیاطی</p>
                    <p class="no-print">برای چاپ از Ctrl+P استفاده کنید</p>
                </div>
            </body>
            </html>
        `;
    }
}
