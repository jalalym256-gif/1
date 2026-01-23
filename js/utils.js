// ========== UTILITY FUNCTIONS ==========
const Utils = {
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatPrice(price) {
        if (!price && price !== 0) return '۰';
        return new Intl.NumberFormat('fa-IR').format(price);
    },

    formatDate(dateString) {
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
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showNotification(message, type = 'info', duration = 4000) {
        const existingNotification = document.getElementById('globalNotification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.id = 'globalNotification';
        notification.className = `notification ${type}`;
        
        const colors = {
            success: { bg: '#28a745', border: '#28a745' },
            error: { bg: '#dc3545', border: '#dc3545' },
            warning: { bg: '#ffc107', border: '#ffc107', text: '#333' },
            info: { bg: '#17a2b8', border: '#17a2b8' }
        };
        
        const color = colors[type] || colors.info;
        
        notification.innerHTML = `
            <span style="font-size: 20px; font-weight: bold;">${type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ'}</span>
            <span>${this.escapeHtml(message)}</span>
        `;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '30px',
            right: '30px',
            padding: '20px 30px',
            borderRadius: '12px',
            color: color.text || 'white',
            fontWeight: '600',
            zIndex: '10000',
            maxWidth: '500px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            fontSize: '15px',
            transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            backdropFilter: 'blur(10px)',
            borderLeft: `5px solid ${color.border}`,
            backgroundColor: color.bg,
            opacity: '0',
            transform: 'translateX(100px)'
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => notification.remove(), 500);
        }, duration);
    },

    showLoading(message = 'در حال بارگذاری...') {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            
            const text = document.createElement('div');
            text.id = 'loadingText';
            text.textContent = message;
            
            overlay.appendChild(spinner);
            overlay.appendChild(text);
            document.body.appendChild(overlay);
        }
        
        overlay.style.display = 'flex';
        document.getElementById('loadingText').textContent = message;
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};