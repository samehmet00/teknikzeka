// js/index.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    if (mobileBtn && navMenu) { mobileBtn.addEventListener('click', (e) => { e.stopPropagation(); navMenu.classList.toggle('active'); }); }
    document.addEventListener('click', (e) => { if (navMenu && navMenu.classList.contains('active') && !navMenu.contains(e.target)) { navMenu.classList.remove('active'); } });

    
    const heroBtn = document.getElementById('hero-action-btn');
    const fabBtn = document.getElementById('fab-action-btn');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 250) { if (heroBtn) heroBtn.classList.add('hidden'); if (fabBtn) fabBtn.classList.add('visible'); } 
        else { if (heroBtn) heroBtn.classList.remove('hidden'); if (fabBtn) fabBtn.classList.remove('visible'); }
    });

    const sentences = document.querySelectorAll(".cinematic-sentence");
    const triggers = document.querySelectorAll(".trigger");
    const centerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const stepIndex = entry.target.getAttribute("data-step"); if (stepIndex === null) return;
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

const authMenu = document.getElementById('dynamic-auth-menu');
const heroBtnAuth = document.getElementById('hero-action-btn');
const fabBtnAuth = document.getElementById('fab-action-btn');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const username = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0]; 
        
        // YENİ: Veritabanından rolü çek
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const isTech = userDoc.exists() && userDoc.data().role === "servis";
        const targetPage = isTech ? "pages/service.html" : "pages/dashboard.html"; 
        
        if (authMenu) {
            authMenu.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="profile-dropdown" id="profile-dropdown-container">
                        <span class="user-name-text" style="color: var(--text-main); font-weight: bold; font-size: 1rem;">&nbsp;&nbsp;👤 ${username}</span>
                        <button class="three-dots-btn" title="Menü">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>
                        
                        <div class="profile-dropdown-content">
                            ${!isTech ? `<a href="pages/dashboard.html">📊 ⏐ Müşteri Paneli</a>` : `<a href="pages/service.html">🛠️ ⏐ Servis Paneli</a>`}
                            <a href="pages/profile.html">👤 ⏐ Profilim</a>
                            <a href="pages/settings.html">⚙️ ⏐ Ayarlar</a>
                        </div>
                    </div>
                    
                    <button id="home-logout-btn" class="logout-icon-btn" title="Sistemden Çıkış">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </button>
                </div>
            `;
            
            const dropdownContainer = document.getElementById('profile-dropdown-container');
            dropdownContainer.addEventListener('click', (e) => { e.stopPropagation(); dropdownContainer.classList.toggle('open'); });
            document.addEventListener('click', () => { if (dropdownContainer) dropdownContainer.classList.remove('open'); });

            document.getElementById('home-logout-btn').addEventListener('click', (e) => { 
                e.stopPropagation(); signOut(auth).then(() => { window.location.reload(); }); 
            });
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