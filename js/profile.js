// js/profile.js — Profil sayfası mantığı (önbellekli)
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CACHE_KEY = 'tz_profile_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

const card = document.getElementById('profile-main-card');

function starHtml(rating, size = 14) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
        s += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${i <= Math.round(rating) ? '#F59E0B' : 'none'}" stroke="#F59E0B" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    }
    return s;
}

function renderProfile(html) {
    card.innerHTML = html;
    document.getElementById('profile-logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem(CACHE_KEY);
        signOut(auth).then(() => { window.location.href = 'login.html'; });
    });
}

function buildProfileHtml({ isTech, heroColor, companyDisplay, email, roleLabel,
    stat1Value, stat1Label, stat1Icon, stat2Value, stat2Label, stat2Icon, extraHtml }) {

    const techIcon = `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`;
    const userIcon = `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`;
    const accentEnd = isTech ? '#059669' : '#06B6D4';

    return `
        <div class="profile-hero-banner" style="background:linear-gradient(135deg,${heroColor} 0%,#6366f1 50%,${accentEnd} 100%);">
            <div class="profile-avatar-wrap">
                <div class="profile-avatar-circle">${companyDisplay.charAt(0).toUpperCase()}</div>
                <h2 class="profile-username">${companyDisplay}</h2>
                <p class="profile-email">${email}</p>
                <span class="profile-role-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">${isTech ? techIcon : userIcon}</svg>
                    ${roleLabel}
                </span>
            </div>
            <div style="height:1.2rem;"></div>
        </div>

        <div class="profile-stats-row">
            <div class="profile-stat-box">
                <div class="stat-icon ${isTech ? 'green' : ''}" style="margin:0 auto 8px;width:32px;height:32px;">${stat1Icon}</div>
                <span class="stat-value">${stat1Value}</span>
                <span class="stat-label">${stat1Label}</span>
            </div>
            <div class="profile-stat-box">
                <div class="stat-icon ${isTech ? 'gold' : ''}" style="margin:0 auto 8px;width:32px;height:32px;">${stat2Icon}</div>
                <span class="stat-value">${stat2Value}</span>
                <span class="stat-label">${stat2Label}</span>
            </div>
        </div>

        ${extraHtml}

        <nav class="profile-menu">
            <a href="settings.html" class="profile-menu-item">
                <div class="profile-menu-item-left">
                    <div class="profile-menu-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                    </div>
                    Ayarlar
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </a>
            <a href="notifications.html" class="profile-menu-item">
                <div class="profile-menu-item-left">
                    <div class="profile-menu-icon green">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    </div>
                    Bildirimler
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </a>
            ${isTech ? `
            <a href="service.html" class="profile-menu-item">
                <div class="profile-menu-item-left">
                    <div class="profile-menu-icon" style="background:rgba(79,70,229,0.08);color:var(--primary);">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    </div>
                    Servis Paneli
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </a>` : `
            <a href="tickets.html" class="profile-menu-item">
                <div class="profile-menu-item-left">
                    <div class="profile-menu-icon" style="background:rgba(79,70,229,0.08);color:var(--primary);">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    Ariza Kayitlarim
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </a>`}
        </nav>

        <button id="profile-logout-btn" class="profile-logout-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sistemden Cikis Yap
        </button>
    `;
}

async function loadProfileData(user) {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const isTech = userData.role === 'servis';
    const username = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
    const companyDisplay = isTech && userData.companyName ? userData.companyName : username;
    const roleLabel = isTech ? 'Teknik Servis' : 'Müsteri';
    const heroColor = isTech ? '#10B981' : '#4F46E5';

    let stat1Value = '—', stat1Label = '', stat1Icon = '';
    let stat2Value = '—', stat2Label = '', stat2Icon = '';
    let extraHtml = '';

    const checkSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    const clockSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const fileSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    const starFilledSVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const starEmptySVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

    if (isTech) {
        const serviceEmail = user.email;
        const [reviewsSnap, ticketsSnap] = await Promise.all([
            getDocs(query(collection(db, 'reviews'), where('serviceEmail', '==', serviceEmail))),
            getDocs(query(collection(db, 'tickets'), where('assignedService', '==', serviceEmail), where('processCompleted', '==', true)))
        ]);

        let totalRating = 0, reviewCount = 0, recentReviews = [];
        reviewsSnap.forEach(r => {
            const d = r.data();
            totalRating += d.rating;
            reviewCount++;
            recentReviews.push(d);
        });
        recentReviews.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        const avgRating = reviewCount > 0 ? (totalRating / reviewCount) : 0;
        const completedCount = ticketsSnap.size;

        stat1Value = completedCount;
        stat1Label = 'Tamamlanan Is';
        stat1Icon = checkSVG;
        stat2Value = avgRating > 0 ? avgRating.toFixed(1) : '—';
        stat2Label = avgRating > 0 ? `Ort. Puan (${reviewCount} yorum)` : 'Henüz Puan Yok';
        stat2Icon = avgRating > 0 ? starFilledSVG : starEmptySVG;

        const starsHtml = avgRating > 0 ? `
            <div style="display:flex;align-items:center;gap:4px;justify-content:center;margin-top:4px;">
                ${starHtml(avgRating)}
                <span style="font-size:0.8rem;color:var(--gray-light);margin-left:4px;">${avgRating.toFixed(1)}</span>
            </div>` : '';

        let reviewsHtml = '';
        if (recentReviews.length > 0) {
            const top3 = recentReviews.slice(0, 3);
            reviewsHtml = `
            <div class="profile-section">
                <div class="profile-section-title">Son Yorumlar</div>
                ${top3.map(rv => {
                    const initial = rv.userEmail ? rv.userEmail[0].toUpperCase() : '?';
                    return `
                    <div class="review-item">
                        <div class="review-avatar-mini">${initial}</div>
                        <div class="review-body">
                            <div class="review-stars">${starHtml(rv.rating, 12)}</div>
                            <div class="review-comment">${rv.comment || '<em style="opacity:0.5;">Yorum yazilmamis.</em>'}</div>
                            <div class="review-user">${rv.userEmail}</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
        }
        extraHtml = starsHtml + reviewsHtml;
    } else {
        const ticketsSnap = await getDocs(query(collection(db, 'tickets'), where('userEmail', '==', user.email)));
        const totalTickets = ticketsSnap.size;
        let activeCount = 0;
        ticketsSnap.forEach(t => {
            const d = t.data();
            if (d.assignedService && !d.processCompleted) activeCount++;
        });

        stat1Value = totalTickets;
        stat1Label = 'Toplam Kayit';
        stat1Icon = fileSVG;
        stat2Value = activeCount;
        stat2Label = 'Aktif Islem';
        stat2Icon = clockSVG;

        if (activeCount > 0) {
            extraHtml = `
            <a href="tickets.html" class="profile-active-ticket-link">
                <div>
                    <span class="profile-active-ticket-link-text">Aktif Islemleri Goruntule</span>
                    <span class="profile-active-ticket-link-sub">${activeCount} devam eden isleminiz var</span>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </a>`;
        }
    }

    return { isTech, heroColor, companyDisplay, email: user.email, roleLabel,
             stat1Value, stat1Label, stat1Icon, stat2Value, stat2Label, stat2Icon, extraHtml };
}

// --- ANA AKIŞ ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        card.innerHTML = `
            <div style="padding:3rem;text-align:center;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" style="margin-bottom:1rem;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <h3 style="color:var(--text-main);margin-bottom:8px;">Oturum Acilmamis</h3>
                <p style="color:var(--gray-light);margin-bottom:1.5rem;">Profilinizi gormek icin giris yapin.</p>
                <a href="login.html" style="background:var(--primary);color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Giris Yap</a>
            </div>`;
        return;
    }

    // 1. Önbellekten hızlı göster
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const { html, uid, ts } = JSON.parse(cached);
            if (uid === user.uid && Date.now() - ts < CACHE_TTL) {
                renderProfile(html);
                // Arkaplanda güncelle
                loadProfileData(user).then(data => {
                    const freshHtml = buildProfileHtml(data);
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ html: freshHtml, uid: user.uid, ts: Date.now() }));
                    renderProfile(freshHtml);
                });
                return;
            }
        } catch (e) { /* bozuk önbellek */ }
    }

    // 2. Önbellek yok/süresi dolmuş — Firestore'dan yükle
    try {
        const data = await loadProfileData(user);
        const html = buildProfileHtml(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ html, uid: user.uid, ts: Date.now() }));
        renderProfile(html);
    } catch (err) {
        console.error('Profil yükleme hatası:', err);
        card.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--gray-light);">Profil yüklenemedi. Lütfen tekrar deneyin.</div>`;
    }
});
