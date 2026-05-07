// js/theme-manager.js
window.applyGlobalTheme = function () {
    const pref = localStorage.getItem('global_theme') || 'light';
    document.body.classList.toggle('light-mode', pref === 'light');
};
window.applyGlobalTheme();

// ========== GOOGLE TRANSLATE GLOBAL LOGIC ==========
window.googleTranslateElementInit = function() {
    new google.translate.TranslateElement({
        pageLanguage: 'tr',
        includedLanguages: 'en,de,ar,ru,fr', // Tüm dilleri destekle
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
    }, 'google_translate_element');
};

// Çerez Yardımcı Fonksiyonu
window.setTranslateCookie = function(lang) {
    const domain = window.location.hostname;
    const expires = new Date(Date.now() + 365 * 864e5).toUTCString(); // 1 yıl geçerli
    
    if (lang === 'tr') {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
        document.cookie = `googtrans=/tr/tr; path=/;`; // Bazı tarayıcılar için gerekebilir
    } else {
        document.cookie = `googtrans=/tr/${lang}; expires=${expires}; path=/;`;
        document.cookie = `googtrans=/tr/${lang}; expires=${expires}; path=/; domain=${domain}`;
    }
};

// Google Translate Scriptini ve Gizli Elementi Enjekte Et (Hızlı Yükleme)
(function() {
    if (!document.getElementById('google_translate_element')) {
        const div = document.createElement('div');
        div.id = 'google_translate_element';
        div.style.display = 'none';
        document.body.appendChild(div);
    }
    
    // Scripti daha erken yüklemek için head'e ekleyelim
    if (!document.getElementById('google-translate-script')) {
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.async = true;
        script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.head.appendChild(script);
    }
})();