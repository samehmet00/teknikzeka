import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. MOBİL MENÜ YÖNETİMİ ---
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');

    if (mobileBtn && navMenu) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active'); 
        });
    }

    document.addEventListener('click', (e) => {
        if (navMenu && navMenu.classList.contains('active') && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });

    // --- 2. TEMA YÖNETİMİ ---
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!localStorage.getItem('theme')) { localStorage.setItem('theme', 'dark'); }
    if (localStorage.getItem('theme') === 'light') { document.body.classList.add('light-mode'); }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            if (document.body.classList.contains('light-mode')) { 
                localStorage.setItem('theme', 'light'); 
            } else { 
                localStorage.setItem('theme', 'dark'); 
            }
        });
    }

    // --- 3. İKİLİ BUTON ANİMASYONU ---
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

    // --- 4. SİNEMATİK ANİMASYONLAR ---
    const sentences = document.querySelectorAll(".cinematic-sentence");
    const triggers = document.querySelectorAll(".trigger");
    const centerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const stepIndex = entry.target.getAttribute("data-step");
            if (stepIndex === null) return;
            const text = sentences[stepIndex];
            if (entry.isIntersecting) { text.classList.add("active"); text.classList.remove("exit-up"); } 
            else { text.classList.remove("active"); if (entry.boundingClientRect.top < 0) { text.classList.add("exit-up"); } else { text.classList.remove("exit-up"); } }
        });
    }, { root: null, rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    triggers.forEach(trigger => centerObserver.observe(trigger));

    const reveals = document.querySelectorAll(".reveal");
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("active"); observer.unobserve(entry.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });
    reveals.forEach(reveal => revealObserver.observe(reveal));
});

// --- 5. GİRİŞ VE AKILLI BUTON ---
const authMenu = document.getElementById('dynamic-auth-menu');
const heroBtnAuth = document.getElementById('hero-action-btn');
const fabBtnAuth = document.getElementById('fab-action-btn');
const techServiceEmails = ["servis@teknikzeka.app", "admin@test.com"];

onAuthStateChanged(auth, (user) => {
    if (user) {
        const username = user.email.split('@')[0]; 
        const isTech = techServiceEmails.includes(user.email);
        const targetPage = isTech ? "pages/service.html" : "pages/login.html"; 
        
        if (authMenu) {
            authMenu.innerHTML = `
                <div class="user-profile-pill">
                    <a href="${targetPage}" class="user-name-text">👤 ${username}</a>
                    <button id="home-logout-btn" class="logout-icon-btn" title="Çıkış Yap">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </button>
                </div>
            `;
            document.getElementById('home-logout-btn').addEventListener('click', () => { signOut(auth).then(() => { window.location.reload(); }); });
        }

        const btnContent = `<span class="btn-text">Arıza Kayıtlarını Görüntüle</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        if (heroBtnAuth) { heroBtnAuth.innerHTML = btnContent; heroBtnAuth.href = targetPage; }
        if (fabBtnAuth) { fabBtnAuth.innerHTML = btnContent; fabBtnAuth.href = targetPage; }

    } else {
        if (authMenu) authMenu.innerHTML = `<a href="pages/login.html" class="nav-login-btn">Giriş Yap</a>`;
        const defaultContent = `<span class="btn-text">Hemen Arıza Kaydı Oluştur</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        if (heroBtnAuth) { heroBtnAuth.innerHTML = defaultContent; heroBtnAuth.href = "pages/login.html"; }
        if (fabBtnAuth) { fabBtnAuth.innerHTML = defaultContent; fabBtnAuth.href = "pages/login.html"; }
    }
});