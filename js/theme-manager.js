// js/theme-manager.js

window.applyGlobalTheme = function() {
    // 1. Ayarlardan seçilen tercihi al. Yoksa 'smart' kabul et.
    const userPref = localStorage.getItem('global_theme') || 'smart';
    
    // 2. Kullanıcının HANGİ SAYFADA olduğunu bul
    const currentPath = window.location.pathname;
    const isHomePage = currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('teknikzeka/'); // Anasayfada mı?

    // Remove all possible theme classes first
    document.body.classList.remove('light-mode', 'theme-ocean', 'theme-forest', 'theme-sunset');

    // 3. Mantığı İşlet
    if (userPref === 'dark') {
        // Zaten default dark, class eklemeye gerek yok
    } 
    else if (userPref === 'light') {
        document.body.classList.add('light-mode');
    } 
    else if (userPref === 'ocean') {
        document.body.classList.add('theme-ocean');
    }
    else if (userPref === 'forest') {
        document.body.classList.add('theme-forest');
    }
    else if (userPref === 'sunset') {
        document.body.classList.add('theme-sunset');
    }
    else {
        // SMART (Akıllı) MOD: Anasayfa koyu, diğer sayfalar açık
        if (!isHomePage) {
            document.body.classList.add('light-mode'); 
        }
    }
};

// Sayfa yüklendiğinde doğrudan çalıştır
window.applyGlobalTheme();