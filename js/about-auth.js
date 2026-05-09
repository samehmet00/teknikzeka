// js/about-auth.js — Hakkımızda sayfası navbar auth yönetimi (önbellekli)
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const authMenu = document.getElementById('dynamic-auth-menu');

function renderAuthUI(username, isTech) {
    if (!authMenu) return;
    authMenu.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <div class="profile-dropdown" id="profile-dropdown-container">
                <span class="user-name-text" style="color:var(--text-main);font-weight:bold;font-size:0.95rem;display:flex;align-items:center;gap:5px;">
                    &nbsp;<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> <span class="name-truncate">${username}</span>
                </span>
                <button class="three-dots-btn" title="Menü">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </button>
                <div class="profile-dropdown-content">
                    ${!isTech ? `<a href="dashboard.html">Müşteri Paneli</a>` : `<a href="service.html">Servis Paneli</a>`}
                    <a href="chats.html">Mesajlarım</a>
                    <a href="notifications.html">Bildirimlerim</a>
                    <a href="profile.html">Profilim</a>
                    <a href="settings.html">Ayarlar</a>
                </div>
            </div>
            <button id="home-logout-btn" class="logout-icon-btn" title="Çıkış">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
        </div>`;

    const dropdown = document.getElementById('profile-dropdown-container');
    if (dropdown) {
        dropdown.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('open'); });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
    }
    document.getElementById('home-logout-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        localStorage.removeItem('tz_index_cache');
        signOut(auth).then(() => window.location.reload());
    });
}

// Önbellekten hızlı göster
const cachedUser = JSON.parse(localStorage.getItem('tz_index_cache') || 'null');
if (cachedUser) renderAuthUI(cachedUser.username, cachedUser.isTech);

// Firebase ile doğrula + güncelle
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const username = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const isTech = userDoc.exists() && userDoc.data().role === 'servis';
        localStorage.setItem('tz_index_cache', JSON.stringify({ username, isTech }));
        renderAuthUI(username, isTech);
    } else {
        localStorage.removeItem('tz_index_cache');
        if (authMenu) authMenu.innerHTML = `<a href="login.html" class="nav-login-btn">Giriş Yap</a>`;
    }
});
