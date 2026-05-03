// js/index.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- GLOBAL BUTON DEĞİŞKENLERİ ---
const authMenu = document.getElementById('dynamic-auth-menu');
const heroBtnAuth = document.getElementById('hero-action-btn');
const fabBtnAuth = document.getElementById('fab-action-btn');
const sellBtnAuth = document.getElementById('sell-action-btn');

document.addEventListener("DOMContentLoaded", function() {
    // Mobil Menü
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    if (mobileBtn && navMenu) { 
        mobileBtn.addEventListener('click', (e) => { e.stopPropagation(); navMenu.classList.toggle('active'); }); 
    }
    document.addEventListener('click', (e) => { 
        if (navMenu && navMenu.classList.contains('active') && !navMenu.contains(e.target)) { navMenu.classList.remove('active'); } 
    });

    // Kayan (Floating) ve Hero Buton Gizleme/Gösterme Mantığı
    const heroBtn = document.getElementById('hero-action-btn');
    const fabBtn = document.getElementById('fab-action-btn');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 250) { 
            if (heroBtn) heroBtn.classList.add('hidden'); 
            if (fabBtn) fabBtn.classList.add('visible'); 
        } else { 
            if (heroBtn) heroBtn.classList.remove('hidden'); 
            if (fabBtn) fabBtn.classList.remove('visible'); 
        }
    });

    // --- SİNEMATİK YAZI ANİMASYONU ---
    const sentences = document.querySelectorAll(".cinematic-sentence");
    const triggers = document.querySelectorAll(".trigger");
    const centerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const stepIndex = entry.target.getAttribute("data-step"); 
            if (stepIndex === null) return;
            const text = sentences[stepIndex];
            
            if (entry.isIntersecting) { 
                text.classList.add("active"); 
                text.classList.remove("exit-up"); 
            } else { 
                text.classList.remove("active"); 
                if (entry.boundingClientRect.top < 0) { 
                    text.classList.add("exit-up"); 
                } else { 
                    text.classList.remove("exit-up"); 
                } 
            }
        });
    }, { root: null, rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    triggers.forEach(trigger => centerObserver.observe(trigger));

    const reveals = document.querySelectorAll(".reveal");
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => { 
            if (entry.isIntersecting) { 
                entry.target.classList.add("active"); 
                observer.unobserve(entry.target); 
            } 
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });
    reveals.forEach(reveal => revealObserver.observe(reveal));

    // --- SAYAÇ (COUNTER) ANİMASYONU ---
    const counters = document.querySelectorAll('.counter-number');
    let counted = false;
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !counted) {
                counted = true; 
                counters.forEach(counter => {
                    const updateCount = () => {
                        const target = +counter.getAttribute('data-target');
                        const count = +counter.innerText;
                        const inc = target / 50; 
                        
                        if (count < target) {
                            counter.innerText = Math.ceil(count + inc);
                            setTimeout(updateCount, 30);
                        } else {
                            counter.innerText = target;
                        }
                    };
                    updateCount();
                });
            }
        });
    }, { threshold: 0.5 }); 
    const sellSection = document.getElementById('sell-device');
    if(sellSection) counterObserver.observe(sellSection);
});

// --- AUTH (GİRİŞ/ÇIKIŞ VE YÖNLENDİRME) İŞLEMLERİ ---

// Ekranda yavaş yüklenmeyi engellemek için LocalStorage'dan okuma
const cachedUser = JSON.parse(localStorage.getItem('tz_index_cache'));
if (cachedUser) {
    renderAuthUI(cachedUser.username, cachedUser.isTech);
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const username = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0]; 
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const isTech = userDoc.exists() && userDoc.data().role === "servis";
        
        localStorage.setItem('tz_index_cache', JSON.stringify({ username, isTech }));
        renderAuthUI(username, isTech);
    } else {
        localStorage.removeItem('tz_index_cache');
        renderGuestUI();
    }
});

// GİRİŞ YAPILMIŞ HALİ (Müşteri veya Servis)
function renderAuthUI(username, isTech) {
    const targetPage = isTech ? "pages/service.html" : "pages/dashboard.html"; 
    
    // Navbar Profil Menüsü
    if (authMenu) {
        authMenu.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="profile-dropdown" id="profile-dropdown-container">
                    <span class="user-name-text" style="color: var(--text-main); font-weight: bold; font-size: 1rem;">&nbsp;&nbsp;👤 ${username}</span>
                    <button class="three-dots-btn" title="Menü">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    </button>
                    
                    <div class="profile-dropdown-content">
                        ${!isTech ? `<a href="pages/dashboard.html">Müşteri Paneli</a>` : `<a href="pages/service.html">Servis Paneli</a>`}
                        <a href="pages/chats.html">Mesajlarım</a>
                        <a href="pages/profile.html">Profilim</a>
                        <a href="pages/settings.html">Ayarlar</a>
                    </div>
                </div>
                
                <button id="home-logout-btn" class="logout-icon-btn" title="Sistemden Çıkış">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
            </div>
        `;
        
        const dropdownContainer = document.getElementById('profile-dropdown-container');
        if (dropdownContainer) dropdownContainer.addEventListener('click', (e) => { e.stopPropagation(); dropdownContainer.classList.toggle('open'); });
        document.addEventListener('click', () => { if (dropdownContainer) dropdownContainer.classList.remove('open'); });

        const logoutBtn = document.getElementById('home-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                localStorage.removeItem('tz_index_cache');
                signOut(auth).then(() => { window.location.reload(); }); 
            });
        }
    }

    // 1. Ana Hero Butonu
    if (heroBtnAuth) { 
        heroBtnAuth.href = targetPage; 
        heroBtnAuth.innerHTML = `
            <div class="btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div class="btn-text-wrapper">
                <span class="btn-title">İşlemlerime Git</span>
                <span class="btn-subtitle">Panelinize güvenli erişim</span>
            </div>
        `;
    }

    // 2. Kayan Buton (FAB) YENİ EKLENDİ!
    if (fabBtnAuth) {
        fabBtnAuth.href = targetPage;
        fabBtnAuth.innerHTML = `
            <span class="btn-text">İşlemlerime Git</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        `;
    }

    // 3. Cihaz Sat Butonu
    if (sellBtnAuth) { 
        sellBtnAuth.href = targetPage; 
        sellBtnAuth.innerHTML = `
            <div class="btn-icon">
                <span style="font-size: 1.5rem; font-weight: 800;">₺</span>
            </div>
            <div class="btn-text-wrapper">
                <span class="btn-title">Panelden İlan Ver</span>
                <span class="btn-subtitle">İşlemlerinize giderek satışı başlatın</span>
            </div>
        `;
    }
}

// ÇIKIŞ YAPILMIŞ HALİ (Misafir Ekranı)
function renderGuestUI() {
    if (authMenu) authMenu.innerHTML = `<a href="pages/login.html" class="nav-login-btn">Giriş Yap</a>`;
    
    // 1. Ana Hero Butonu
    if (heroBtnAuth) { 
        heroBtnAuth.href = "pages/login.html"; 
        heroBtnAuth.innerHTML = `
            <div class="btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <div class="btn-text-wrapper">
                <span class="btn-title">Arıza Kaydı Oluştur</span>
                <span class="btn-subtitle">Yapay zekâ ile anında teşhis</span>
            </div>
        `;
    }

    // 2. Kayan Buton (FAB) YENİ EKLENDİ!
    if (fabBtnAuth) {
        fabBtnAuth.href = "pages/login.html";
        fabBtnAuth.innerHTML = `
            <span class="btn-text">Hemen Arıza Kaydı Oluştur</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        `;
    }

    // 3. Cihaz Sat Butonu
    if (sellBtnAuth) {
        sellBtnAuth.href = "pages/login.html";
        sellBtnAuth.innerHTML = `
            <div class="btn-icon">
                <span style="font-size: 1.5rem; font-weight: 800;">₺</span>
            </div>
            <div class="btn-text-wrapper">
                <span class="btn-title">Cihazıma Fiyat Al</span>
                <span class="btn-subtitle">Servislerden anında nakit teklifi</span>
            </div>
        `;
    }
}