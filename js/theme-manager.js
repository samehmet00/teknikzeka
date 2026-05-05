// js/theme-manager.js
window.applyGlobalTheme = function () {
    const pref = localStorage.getItem('global_theme') || 'light';
    document.body.classList.remove('light-mode');
    if (pref === 'light') document.body.classList.add('light-mode');
    // 'dark' = varsayılan koyu, class eklemeye gerek yok
};
window.applyGlobalTheme();