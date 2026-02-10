// ========== THEME MANAGEMENT ==========
function toggleDarkMode() {
    document.body.classList.remove('light-mode', 'vivid-mode');
    document.body.classList.add('dark-mode');
    currentTheme = 'dark';
    if (dbManager) {
        dbManager.saveSettings('theme', 'dark');
    }
    showNotification('حالت تاریک فعال شد', 'success');
}

function toggleLightMode() {
    document.body.classList.remove('dark-mode', 'vivid-mode');
    document.body.classList.add('light-mode');
    currentTheme = 'light';
    if (dbManager) {
        dbManager.saveSettings('theme', 'light');
    }
    showNotification('حالت روشن فعال شد', 'success');
}

function toggleVividMode() {
    document.body.classList.remove('dark-mode', 'light-mode');
    document.body.classList.add('vivid-mode');
    currentTheme = 'vivid';
    if (dbManager) {
        dbManager.saveSettings('theme', 'vivid');
    }
    showNotification('حالت ویوید فعال شد', 'success');
}