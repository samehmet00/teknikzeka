// js/theme-manager.js

window.applyGlobalTheme = function() {
    // 1. Ayarlardan seçilen tercihi al. Yoksa 'smart' kabul et.
    const userPref = localStorage.getItem('global_theme') || 'smart';
    
    // 2. Kullanıcının HANGİ SAYFADA olduğunu bul
    const currentPath = window.location.pathname;
    const isHomePage = currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('teknikzeka/'); // Anasayfada mı?

    // 3. Mantığı İşlet
    if (userPref === 'dark') {
        // Her yerde koyu
        document.body.classList.remove('light-mode');
    } 
    else if (userPref === 'light') {
        // Her yerde açık
        document.body.classList.add('light-mode');
    } 
    else {
        // SMART (Akıllı) MOD: Anasayfa koyu, diğer sayfalar açık
        if (isHomePage) {
            document.body.classList.remove('light-mode'); // Koyu
        } else {
            document.body.classList.add('light-mode'); // Açık (Paneller)
        }
    }
};

// Sayfa yüklendiğinde doğrudan çalıştır
window.applyGlobalTheme();