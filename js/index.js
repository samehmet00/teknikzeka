// js/index.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const authMenu = document.getElementById('dynamic-auth-menu');
const heroBtnAuth = document.getElementById('hero-action-btn');
const fabBtnAuth = document.getElementById('fab-action-btn');
const sellBtnAuth = document.getElementById('sell-action-btn');

// ========== DİL SİSTEMİ ==========
let currentLang = localStorage.getItem('tz_lang') || 'tr';

function applyLang(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-tr]').forEach(el => {
        const text = lang === 'tr' ? el.getAttribute('data-tr') : el.getAttribute('data-en');
        if (text) el.textContent = text;
    });
    const langText = document.getElementById('lang-text');
    if (langText) langText.textContent = lang === 'tr' ? 'EN' : 'TR';
    localStorage.setItem('tz_lang', lang);
}

document.addEventListener("DOMContentLoaded", () => {
    // Dil Başlatma
    applyLang(currentLang);
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            applyLang(currentLang === 'tr' ? 'en' : 'tr');
        });
    }

    // Tema Toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const isLight = document.body.classList.contains('light-mode');
            const newTheme = isLight ? 'dark' : 'light';
            localStorage.setItem('global_theme', newTheme);
            if (window.applyGlobalTheme) window.applyGlobalTheme();
        });
    }

    // Mobil Menü
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    if (mobileBtn && navMenu) {
        mobileBtn.addEventListener('click', (e) => { e.stopPropagation(); navMenu.classList.toggle('active'); });
    }
    document.addEventListener('click', (e) => {
        if (navMenu && navMenu.classList.contains('active') && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });

    // Navbar scroll efekti
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 40);
        if (fabBtnAuth) fabBtnAuth.classList.toggle('visible', window.scrollY > 300);
    });

    // Reveal animasyon
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => revealObserver.observe(el));

    // Sayaç animasyonu — tüm .counter-number elementleri
    const counters = document.querySelectorAll('.counter-number');
    const triggered = new Set();
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const parent = entry.target;
            // Bu section içindeki sayaçları bul ve çalıştır
            parent.querySelectorAll('.counter-number').forEach(counter => {
                if (triggered.has(counter)) return;
                triggered.add(counter);
                const target = +counter.getAttribute('data-target');
                const run = () => {
                    const current = +counter.innerText;
                    const inc = Math.max(1, Math.ceil(target / 60));
                    if (current < target) {
                        counter.innerText = Math.min(current + inc, target);
                        setTimeout(run, 24);
                    } else {
                        counter.innerText = target;
                    }
                };
                run();
            });
        });
    }, { threshold: 0.3 });

    // Sayaç içeren tüm bölümleri izle
    ['.hero-stats', '.trust-strip', '#sell-device'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) counterObserver.observe(el);
    });
});

// --- AUTH ---
const cachedUser = JSON.parse(localStorage.getItem('tz_index_cache'));
if (cachedUser) renderAuthUI(cachedUser.username, cachedUser.isTech);

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

function renderAuthUI(username, isTech) {
    const targetPage = isTech ? "pages/service.html" : "pages/tickets.html";

    if (authMenu) {
        authMenu.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div class="profile-dropdown" id="profile-dropdown-container">
                    <span class="user-name-text" style="color:var(--text-main); font-weight:bold; font-size:1rem; display:flex; align-items:center; gap:5px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        ${username}
                    </span>
                    <button class="three-dots-btn" title="Menü">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                    <div class="profile-dropdown-content">
                        <a href="index.html">Ana Sayfa</a>
                        ${!isTech ? `<a href="pages/dashboard.html">Yeni Kayıt Oluştur</a><a href="pages/tickets.html">Geçmiş Kayıtlarım</a>` : `<a href="pages/service.html">Servis Paneli</a>`}
                        <a href="pages/chats.html">Mesajlarım</a>
                        <a href="pages/profile.html">Profilim</a>
                        <a href="pages/settings.html">Ayarlar</a>
                    </div>
                </div>
                <button id="home-logout-btn" class="logout-icon-btn" title="Çıkış Yap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
            </div>
        `;
        const dd = document.getElementById('profile-dropdown-container');
        if (dd) dd.addEventListener('click', (e) => { e.stopPropagation(); dd.classList.toggle('open'); });
        document.addEventListener('click', () => { if (dd) dd.classList.remove('open'); });
        const logoutBtn = document.getElementById('home-logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            localStorage.removeItem('tz_index_cache');
            signOut(auth).then(() => window.location.reload());
        });
    }

    const navLink = document.getElementById('nav-records-link');
    if (navLink) {
        navLink.href = isTech ? "pages/service.html" : "pages/tickets.html";
        navLink.innerText = isTech ? "Servis İşlemlerim" : "Geçmiş Kayıtlarım";
    }

    if (heroBtnAuth) {
        heroBtnAuth.href = targetPage;
        heroBtnAuth.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> İşlemlerime Git`;
    }
    if (fabBtnAuth) {
        fabBtnAuth.href = targetPage;
        fabBtnAuth.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>İşlemlerime Git</span>`;
    }
    if (sellBtnAuth) {
        sellBtnAuth.href = targetPage;
        sellBtnAuth.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Panelden İlan Ver`;
    }
}

function renderGuestUI() {
    if (authMenu) authMenu.innerHTML = `<a href="pages/login.html" class="nav-login-btn">Giriş Yap</a>`;
    const navLink = document.getElementById('nav-records-link');
    if (navLink) { navLink.href = "pages/login.html"; navLink.innerText = "Kayıt Sorgula"; }

    if (heroBtnAuth) {
        heroBtnAuth.href = "pages/login.html";
        heroBtnAuth.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Arıza Kaydı Oluştur`;
    }
    if (fabBtnAuth) {
        fabBtnAuth.href = "pages/login.html";
        fabBtnAuth.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Kayıt Oluştur</span>`;
    }
    if (sellBtnAuth) {
        sellBtnAuth.href = "pages/login.html";
        sellBtnAuth.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Cihazıma Fiyat Al`;
    }
}