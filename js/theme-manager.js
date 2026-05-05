// js/theme-manager.js
window.applyGlobalTheme = function () {
    const pref = localStorage.getItem('global_theme') || 'light';
    document.body.classList.toggle('light-mode', pref === 'light');
};
window.applyGlobalTheme();