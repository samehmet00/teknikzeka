// js/service.js
import { db, auth } from './firebase-config.js';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp, where, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { deviceData } from './deviceData.js';
import { icons } from './icons.js';

// Servis puan ortalamaları
let serviceRatings = {};
async function fetchServiceRatings() {
    try {
        const reviewsSnap = await getDocs(collection(db, "reviews"));
        serviceRatings = {};
        reviewsSnap.forEach(r => {
            const rData = r.data();
            if (!serviceRatings[rData.serviceEmail]) serviceRatings[rData.serviceEmail] = { sum: 0, count: 0 };
            serviceRatings[rData.serviceEmail].sum += rData.rating;
            serviceRatings[rData.serviceEmail].count += 1;
        });
    } catch(e) { console.error("Rating fetch error:", e); }
}

function getRatingHtml(email) {
    const rd = serviceRatings[email];
    if (rd && rd.count > 0) {
        const avg = (rd.sum / rd.count).toFixed(1);
        return `<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.25); padding:3px 10px; border-radius:20px; font-size:0.8rem; font-weight:700; color:#F59E0B;"><svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>${avg} (${rd.count})</span>`;
    }
    return `<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(148,163,184,0.1); border:1px solid rgba(148,163,184,0.2); padding:3px 10px; border-radius:20px; font-size:0.8rem; color:#94A3B8;">Yeni</span>`;
}

async function sendEmailNotification(toEmail, subject, message) {
    try {
        const q = query(collection(db, "users"), where("email", "==", toEmail));
        const querySnapshot = await getDocs(q);
        let wantsEmail = true; 
        if (!querySnapshot.empty && querySnapshot.docs[0].data().notifEmail === false) wantsEmail = false; 

        if (wantsEmail) {
            await emailjs.send("service_u85t58o", "template_0a4enu5", { to_email: toEmail, subject: subject, message: message }, "_P1jn1r_0u2nA33Q3");
        }
    } catch (err) { console.error("Mail hatası:", err); }
}

const listContainer = document.getElementById('service-ticket-list'); 
const ticketCountEl = document.getElementById('ticket-count');
const navAuthMenu = document.getElementById('nav-auth-menu');

const filterType = document.getElementById('filter-type');
const filterBrand = document.getElementById('filter-brand');
const filterModel = document.getElementById('filter-model');
const filterSale = document.getElementById('filter-sale');
const filterDate = document.getElementById('filter-date'); 

let allTickets = []; 
window.highestBids = {}; 
let currentPage = 1;
const itemsPerPage = 8; 
window.currentServiceTab = 'havuz'; 

window.formatPrice = (input) => {
    let val = input.value.replace(/\D/g, ''); 
    if (val === '') { input.value = ''; return; }
    input.value = parseInt(val, 10).toLocaleString('tr-TR');
};

function formatAIReport(aiText) {
    if (!aiText) return '';
    try {
        let cleanText = aiText.replace(/\*/g, '');
        let ariza = '', zorluk = 5, sure = '—', aciliyet = 'Orta', cozum = '';
        cleanText.split('\n').forEach(line => {
            const lower = line.toLowerCase();
            if (lower.includes('ariza:') || lower.includes('arıza:')) ariza = line.split(':').slice(1).join(':').trim();
            if (lower.includes('zorluk:')) zorluk = parseInt(line.split(':').slice(1).join(':').trim().replace(/\D/g,'')) || 5;
            if (lower.includes('sure:') || lower.includes('süre:')) sure = line.split(':').slice(1).join(':').trim();
            if (lower.includes('aciliyet:')) aciliyet = line.split(':').slice(1).join(':').trim();
            if (lower.includes('cozum:') || lower.includes('çözüm:') || lower.includes('öneri:')) cozum = line.split(':').slice(1).join(':').trim();
        });
        // Eski format fallback
        if (!ariza || !cozum) {
            const p = aiText.split('Zorluk:');
            if (p.length >= 2) {
                ariza = ariza || p[0].replace('Arıza:', '').trim();
                const rest = p[1].split(/Öneri:|Çözüm:|Cozum:/i);
                zorluk = parseInt(rest[0].trim()) || zorluk;
                cozum = cozum || (rest[1] || '').trim();
            }
        }
        if (!ariza) ariza = 'Analiz ediliyor...';

        const diffColor = zorluk <= 3 ? '#10B981' : zorluk <= 6 ? '#F59E0B' : '#EF4444';
        const diffLabel = zorluk <= 3 ? 'Kolay' : zorluk <= 6 ? 'Orta' : 'Zor';
        const diffBg    = zorluk <= 3 ? 'rgba(16,185,129,0.12)' : zorluk <= 6 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
        const aciColor  = aciliyet.toLowerCase().includes('yüksek') || aciliyet.toLowerCase().includes('yuksek') ? '#EF4444'
                        : aciliyet.toLowerCase().includes('orta') ? '#F59E0B' : '#10B981';
        const diffPct   = zorluk * 10;

        return `
        <div class="ai-diag-card">
            <div class="ai-diag-header">
                <div class="ai-diag-icon-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2zM9 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
                </div>
                <span class="ai-diag-title">YZ Ön Teşhis Raporu</span>
                <span class="ai-diag-chip" style="background:${diffBg}; color:${diffColor};">${diffLabel}</span>
            </div>
            <div class="ai-diag-ariza">${ariza}</div>
            <div class="ai-diag-metrics">
                <div class="ai-metric">
                    <div class="ai-metric-label">Onarım Zorluğu</div>
                    <div class="ai-metric-bar-wrap">
                        <div class="ai-metric-bar-track">
                            <div class="ai-metric-bar-fill" style="width:${diffPct}%; background:linear-gradient(90deg,${diffColor}88,${diffColor});"></div>
                        </div>
                        <span class="ai-metric-val" style="color:${diffColor}">${zorluk}/10</span>
                    </div>
                </div>
                <div class="ai-metric">
                    <div class="ai-metric-label">Tahmini Süre</div>
                    <div class="ai-metric-info">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${sure}
                    </div>
                </div>
                <div class="ai-metric">
                    <div class="ai-metric-label">Aciliyet</div>
                    <div class="ai-metric-info" style="color:${aciColor}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        ${aciliyet}
                    </div>
                </div>
            </div>
            ${cozum ? `<div class="ai-diag-solution">
                <div class="ai-diag-sol-label">Çözüm Önerisi</div>
                <div class="ai-diag-sol-text">${cozum}</div>
            </div>` : ''}
        </div>`;
    } catch(e) {
        return `<div class="ai-diag-card" style="padding:1rem; font-size:0.88rem;">${aiText}</div>`;
    }
}

const initServiceCategories = () => {
    if(!filterType) return;
    filterType.innerHTML = '<option value="Tümü">Tümü</option>';
    Object.keys(deviceData).forEach(category => { filterType.appendChild(new Option(category, category)); });
};
initServiceCategories();

// --- SERVİS PANELİ AUTH VE LOCALSTORAGE ---
const cachedService = JSON.parse(localStorage.getItem('tz_service_cache'));
if (cachedService && navAuthMenu) renderServiceAuthUI(cachedService.companyName);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "servis") {
            window.currentServiceEmail = user.email;
            const companyName = userDoc.data().companyName || "Servis";

            localStorage.setItem('tz_service_cache', JSON.stringify({ companyName }));
            if (navAuthMenu) renderServiceAuthUI(companyName);

            // Puan ortalamaları çek
            await fetchServiceRatings();

            const notiQ = query(collection(db, "notifications"), where("userEmail", "==", user.email), where("read", "==", false));
            onSnapshot(notiQ, (snapshot) => {
                const badge = document.getElementById('noti-badge');
                if(badge) { if(snapshot.empty) badge.style.display = 'none'; else { badge.style.display = 'flex'; badge.innerText = snapshot.size; } }
            });

            const qAll = query(collection(db, "tickets"));
            onSnapshot(qAll, (snapshot) => {
                allTickets = [];
                snapshot.forEach(document => { allTickets.push({ id: document.id, ...document.data() }); });
                renderTickets(); 
            });
        } else { window.location.href = "dashboard.html"; }
    } else { 
        localStorage.removeItem('tz_service_cache');
        window.location.href = "login.html"; 
    }
});

function renderServiceAuthUI(companyName) {
    navAuthMenu.innerHTML = `
        <div class="profile-dropdown" id="profile-dropdown-container">
            <span class="user-name-text" style="color: var(--text-main); font-weight: bold; font-size: 1rem; display:inline-flex; align-items:center; gap:5px;">&nbsp;&nbsp;${icons.tool} ${companyName}</span>
            <button class="three-dots-btn" title="Menü"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
            <div class="profile-dropdown-content">
                <a href="../index.html">Ana Sayfa</a>
                <a href="../pages/profile.html">Profilim</a>
                <a href="../pages/settings.html">Ayarlar</a>
                <a href="chats.html">Mesajlarım</a>
            </div>
        </div>
        <button id="home-logout-btn" class="logout-icon-btn" title="Çıkış Yap" style="margin-left: 5px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></button>
    `;
    const dropdownContainer = document.getElementById('profile-dropdown-container');
    if(dropdownContainer) dropdownContainer.addEventListener('click', (e) => { e.stopPropagation(); dropdownContainer.classList.toggle('open'); });
    document.addEventListener('click', () => { if (dropdownContainer) dropdownContainer.classList.remove('open'); });
    
    const logoutBtn = document.getElementById('home-logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            localStorage.removeItem('tz_service_cache');
            signOut(auth).then(() => { window.location.href = "login.html"; }); 
        });
    }
}

const resetPageAndRender = () => { currentPage = 1; renderTickets(); };
if(filterType) {
    filterType.addEventListener('change', (e) => {
        const type = e.target.value; 
        filterBrand.innerHTML = '<option value="Tümü">Tümü</option>'; filterModel.innerHTML = '<option value="Tümü">Tümü</option>'; filterModel.disabled = true;
        if (type !== "Tümü" && deviceData[type]) { Object.keys(deviceData[type]).forEach(brand => filterBrand.appendChild(new Option(brand, brand))); filterBrand.disabled = false; } else { filterBrand.disabled = true; }
        resetPageAndRender();
    });
}
if(filterBrand) {
    filterBrand.addEventListener('change', (e) => {
        const type = filterType.value; const brand = e.target.value; filterModel.innerHTML = '<option value="Tümü">Tümü</option>';
        if (brand !== "Tümü" && deviceData[type] && deviceData[type][brand]) { deviceData[type][brand].forEach(model => filterModel.appendChild(new Option(model, model))); filterModel.disabled = false; } else { filterModel.disabled = true; }
        resetPageAndRender();
    });
}
if(filterModel) filterModel.addEventListener('change', resetPageAndRender);
if(filterSale) filterSale.addEventListener('change', resetPageAndRender);
if(filterDate) filterDate.addEventListener('change', resetPageAndRender);

window.changePage = (pageNumber) => { currentPage = pageNumber; renderTickets(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

window.switchServiceTab = (tabName, event) => {
    window.currentServiceTab = tabName;
    currentPage = 1; 
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(event) event.target.classList.add('active');
    renderTickets();
};

function renderTickets() {
    listContainer.innerHTML = ''; 
    
    let filtered = allTickets.filter(ticket => {
        const matchType = !filterType || filterType.value === "Tümü" || ticket.deviceType === filterType.value;
        const matchBrand = !filterBrand || filterBrand.value === "Tümü" || ticket.deviceBrand === filterBrand.value;
        const matchModel = !filterModel || filterModel.value === "Tümü" || ticket.deviceModel === filterModel.value;
        
        let matchSale = true;
        if (filterSale) {
            if (filterSale.value === "Sadece Satılık") matchSale = ticket.isForSale === true;
            else if (filterSale.value === "Sadece Tamir") matchSale = !ticket.isForSale;
        }

        let matchTab = true;
        if (window.currentServiceTab === 'havuz') {
            // İş havuzu: sadece henüz servis atanmamış kayıtlar
            matchTab = !ticket.assignedService;
        } else if (window.currentServiceTab === 'aktif') {
            // Aktif işlerim: bu servise atanmış + tamamlanmamış
            matchTab = (ticket.assignedService === window.currentServiceEmail) && !ticket.processCompleted;
        } else if (window.currentServiceTab === 'tamamlanan') {
            // Tamamlananlar: bu servise atanmış + tamamlanmış
            matchTab = (ticket.assignedService === window.currentServiceEmail) && !!ticket.processCompleted;
        }

        return matchType && matchBrand && matchModel && matchSale && matchTab;
    });

    if (filterDate) {
        filtered.sort((a, b) => {
            const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return filterDate.value === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }

    if(ticketCountEl) ticketCountEl.innerText = `${filtered.length} Kayıt`;

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTickets = filtered.slice(startIndex, endIndex);

    if (filtered.length === 0) {
        listContainer.innerHTML = `<p style="color:var(--gray-light); text-align:center; padding:3rem;">Bu sekme için kayıt bulunamadı.</p>`;
        // Badge'leri sonunda güncelleyelim — return etmeden aşağıya düş
    } else {

    paginatedTickets.forEach(data => {
        const deviceInfo = data.deviceBrand ? `${data.deviceType} - ${data.deviceBrand} ${data.deviceModel}` : data.deviceType;
        let dateStr = "Şimdi eklendi";
        if(data.createdAt) { const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt); dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }); }

        let techActionHtml = ''; let highestBidHtml = ''; let saleBadge = '';
        if (data.isForSale) {
            let highestBid = 0;
            if (data.offers && typeof data.offers === 'object') { Object.values(data.offers).forEach(val => { let priceNumber = (typeof val === 'object' && val !== null) ? Number(val.price) : Number(val); if (!isNaN(priceNumber) && priceNumber > highestBid) highestBid = priceNumber; }); }
            window.highestBids[data.id] = highestBid; 

            saleBadge = `<span style="color:#10B981; border:1px solid #10B981; padding:2px 6px; border-radius:4px; font-size:0.75rem;">SATILIK</span>`;
            if(highestBid > 0) saleBadge += `<span class="highest-bid-badge" style="display:flex;align-items:center;gap:3px;">${icons.money} Teklif: ${highestBid.toLocaleString('tr-TR')} ₺</span>`;
            else saleBadge += `<span class="highest-bid-badge" style="background: rgba(16, 185, 129, 0.1); color: #10B981; border: 1px dashed #10B981; box-shadow: none;">Bekleniyor</span>`;

            if (data.status === "Satıldı") {
                if (data.assignedService === window.currentServiceEmail) {
                    const myRatingHtml = getRatingHtml(window.currentServiceEmail);
                    techActionHtml = `<div class="success-box-dynamic" style="display:flex; flex-direction:column; gap:12px;">
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                            <span style="display:flex;align-items:center;gap:5px;">${icons.party} Teklifiniz Kabul Edildi! <strong>${data.userEmail}</strong></span>
                            <div style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:var(--gray-light);">Sizin puanınız: ${myRatingHtml}</div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <a href="track.html?id=${data.id}" style="flex:1; text-align:center; padding:9px 10px; background: var(--primary); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; display:flex;align-items:center;justify-content:center;gap:5px;">Süreci Yönet ${icons.gear}</a>
                            <a href="chat.html?ticketId=${data.id}" style="flex:1; text-align:center; padding:9px 10px; border: 1px solid var(--primary); color: var(--primary); text-decoration: none; border-radius: 8px; font-weight: bold; display:flex;align-items:center;justify-content:center;gap:5px;">${icons.chat} Mesajlaş</a>
                        </div>
                    </div>`;
                } else techActionHtml = `<div class="error-box-dynamic" style="display:flex;align-items:center;gap:5px;">${icons.cross} Cihaz başka bir servise satıldı.</div>`;
            } else {
                let myOfferRaw = data.offers ? data.offers[window.currentServiceEmail] : null;
                let myOffer = (typeof myOfferRaw === 'object' && myOfferRaw !== null) ? Number(myOfferRaw.price) : Number(myOfferRaw); if (isNaN(myOffer)) myOffer = 0;
                const minOfferAllowed = highestBid > 0 ? highestBid + 10 : 100; 

                const offerInputHtml = `<div style="display:flex; align-items:center; gap:10px; margin-top:10px; background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 8px; border: 1px dashed #10B981;"><span style="font-weight: 800; color: #10B981; font-size: 1.2rem;">₺</span><input type="text" id="offer-input-${data.id}" oninput="window.formatPrice(this)" placeholder="Teklif (Örn: ${minOfferAllowed})" value="${myOffer ? myOffer.toLocaleString('tr-TR') : ''}" style="flex:1; padding:8px; border-radius:6px; border:1px solid var(--border-color); background:transparent; color:var(--text-main); outline:none;" onclick="event.stopPropagation();"><button onclick="window.makeOffer('${data.id}', '${data.userEmail}', event)" style="background:#10B981; color:white; padding:8px 20px; font-weight:bold; border:none; border-radius:6px; cursor:pointer;">${myOffer ? 'Güncelle' : 'Teklif Gönder'}</button></div>`;

                if (myOffer) {
                    techActionHtml = `<div id="offer-display-${data.id}" style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10B981; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top:10px;"><span style="color: var(--text-main); display:flex;align-items:center;gap:5px;">${icons.check} <strong>${myOffer.toLocaleString('tr-TR')} ₺</strong> teklif verdiniz.</span><button onclick="event.stopPropagation(); document.getElementById('offer-display-${data.id}').style.display='none'; document.getElementById('offer-edit-${data.id}').style.display='block';" style="background: transparent; border: 1px solid #10B981; color: #10B981; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer;">Değiştir</button></div><div id="offer-edit-${data.id}" style="display: none;">${offerInputHtml}</div>`;
                } else techActionHtml = offerInputHtml;
            }
        } else {
            saleBadge = `<span style="color:var(--primary); border:1px solid var(--primary); padding:2px 6px; border-radius:4px; font-size:0.75rem;">TAMİR</span>`;
            if (data.assignedService === window.currentServiceEmail) {
                const myRatingHtml = getRatingHtml(window.currentServiceEmail);
                // Müşteri iptal talebinde bulunmuş mu?
                if (data.cancellationRequested) {
                    techActionHtml = `<div style="display:flex; flex-direction:column; gap:10px;">
                        <div style="padding:10px 14px; background:rgba(245,158,11,0.1); border:1px solid #F59E0B; border-radius:8px; font-size:0.85rem; color:#D97706; display:flex; align-items:center; gap:8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            Müşteri bu işlemi iptal etmek istiyor.
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button onclick="window.approveCancellation('${data.id}', '${data.userEmail}', event)" style="flex:1; padding:9px; background:#EF4444; color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                İptali Onayla
                            </button>
                            <a href="chat.html?ticketId=${data.id}" style="flex:1; text-align:center; padding:9px; border:1px solid var(--primary); color:var(--primary); text-decoration:none; border-radius:8px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:5px;">${icons.chat} Mesajlaş</a>
                        </div>
                    </div>`;
                } else {
                    techActionHtml = `<div class="success-box-dynamic" style="display:flex; flex-direction:column; gap:12px;">
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                            <span style="display:flex;align-items:center;gap:5px;">${icons.check} Müşteri sizi seçti! <strong>${data.userEmail}</strong></span>
                            <div style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:var(--gray-light);">Sizin puanınız: ${myRatingHtml}</div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <a href="track.html?id=${data.id}" style="flex:1; text-align:center; padding:9px 10px; background:var(--primary); color:white; text-decoration:none; border-radius:8px; font-weight:bold; display:flex;align-items:center;justify-content:center;gap:5px;">Süreci Yönet ${icons.gear}</a>
                            <a href="chat.html?ticketId=${data.id}" style="flex:1; text-align:center; padding:9px 10px; border:1px solid var(--primary); color:var(--primary); text-decoration:none; border-radius:8px; font-weight:bold; display:flex;align-items:center;justify-content:center;gap:5px;">${icons.chat} Mesajlaş</a>
                        </div>
                    </div>`;
                }
            } else if (data.assignedService) { techActionHtml = `<div class="error-box-dynamic" style="display:flex;align-items:center;gap:5px;">${icons.cross} Müşteri başka servisi seçti.</div>`; } else if (data.interestedServices && data.interestedServices.includes(window.currentServiceEmail)) { techActionHtml = `<div class="info-box-dynamic" style="display:flex;align-items:center;gap:5px;">${icons.clock} Müşterinin seçimi bekleniyor...</div>`; } else { techActionHtml = `<button onclick="window.approveTicket('${data.id}', '${data.userEmail}', event)" style="background:var(--primary); color:white; padding:10px 20px; font-weight:600; font-size:1rem; border:none; border-radius:8px; cursor:pointer; display:flex;align-items:center;justify-content:center;gap:5px;">Ben Yapabilirim ${icons.tool}</button>`; }
        }

        const bar = document.createElement('div');
        bar.className = 'service-list-bar ticket-wrapper';
        bar.innerHTML = `
            <div class="bar-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div style="display:flex; align-items:flex-start; gap:12px; flex-grow:1; overflow:hidden;">
                    <span style="font-size:1.6rem; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">${icons.phone}</span>
                    <div style="overflow:hidden; min-width:0;">
                        <div class="bar-title">${deviceInfo} ${saleBadge}</div>
                        <div class="bar-summary">
                            <span class="ticket-date-badge">${icons.calendar} ${dateStr}</span>
                            <span class="ticket-desc-text">${data.description.substring(0, 50)}${data.description.length > 50 ? '...' : ''}</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                    <span style="font-size:0.8rem; color:${data.status === 'Bekliyor' ? '#F59E0B' : '#10B981'}; font-weight:700; background:rgba(0,0,0,0.05); padding:3px 9px; border-radius:20px; white-space:nowrap;">${data.status}</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            <div class="bar-details"><div style="display:flex; flex-direction:column; gap:15px; padding-bottom:10px;"><div><span style="color:var(--gray-light); font-size:0.9rem;">Müşteri E-Posta:</span><br><strong>${data.userEmail}</strong></div><div><span style="color:var(--gray-light); font-size:0.9rem;">Detaylı Şikayet:</span><br><span>${data.description}</span></div>${formatAIReport(data.aiReport)}<div style="margin-top:10px; border-top:1px dashed var(--border-color); padding-top:15px;">${techActionHtml}</div></div></div>
        `;
        listContainer.appendChild(bar);
    }); // forEach sonu

    if (totalPages > 1) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';
        let paginationHtml = `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Önceki</button>`;
        for(let i = 1; i <= totalPages; i++) { paginationHtml += `<button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`; }
        paginationHtml += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Sonraki</button>`;
        paginationDiv.innerHTML = paginationHtml;
        listContainer.appendChild(paginationDiv);
    }
    } // else sonu (filtered.length > 0)

    // Badge sayaçları
    const activeCount = allTickets.filter(t =>
        t.assignedService === window.currentServiceEmail && !t.processCompleted
    ).length;
    const doneCount = allTickets.filter(t =>
        t.assignedService === window.currentServiceEmail && !!t.processCompleted
    ).length;

    const activeBadge = document.getElementById('service-active-badge');
    const doneBadge = document.getElementById('service-done-badge');
    if (activeBadge) {
        activeBadge.style.display = activeCount > 0 ? 'inline-block' : 'none';
        activeBadge.innerText = activeCount;
    }
    if (doneBadge) {
        doneBadge.style.display = doneCount > 0 ? 'inline-block' : 'none';
        doneBadge.innerText = doneCount;
    }
}

window.approveTicket = async (ticketId, customerEmail, event) => {
    event.stopPropagation(); 
    try { 
        await updateDoc(doc(db, "tickets", ticketId), { interestedServices: arrayUnion(window.currentServiceEmail) }); 
        await addDoc(collection(db, "notifications"), { userEmail: customerEmail, message: "Bir servis cihazinizi tamir edebilecegini belirtti!", link: "dashboard.html", read: false, createdAt: serverTimestamp() });
        alert("Cihazi yapabilecegimizi onayladiniz. Musteriye iletildi!"); 
    } catch (error) { console.error("Hata:", error); }
};

window.approveCancellation = async (ticketId, customerEmail, event) => {
    event.stopPropagation();
    if (!confirm('Müşterinin iptal talebini onaylamak istediğinize emin misiniz? İş havuzuna geri dönecek.')) return;
    try {
        await updateDoc(doc(db, 'tickets', ticketId), {
            assignedService: '',
            cancellationRequested: false,
            status: 'Bekliyor',
            processStep: 0,
            cargoCode: '',
            interestedServices: []
        });
        await addDoc(collection(db, 'notifications'), {
            userEmail: customerEmail,
            message: 'Servis iptal talebinizi onayladı. Kaydınız tekrar iş havuzuna alındı, yeni servis seçebilirsiniz.',
            link: 'tickets.html',
            read: false,
            createdAt: serverTimestamp()
        });
        sendEmailNotification(customerEmail, 'TeknikZeka: İşleminiz İptal Edildi', 'Servis, iptal talebinizi onayladı. Kaydınız tekrar iş havuzuna alındı. Dilediğiniz zaman yeni bir servis seçebilirsiniz.');
        alert('İptal onaylandı. Kayıt iş havuzuna geri döndü.');
    } catch (e) { console.error('İptal onay hatası:', e); alert('Hata oluştu.'); }
};

window.makeOffer = async (ticketId, customerEmail, event) => {
    event.stopPropagation();
    const priceRaw = document.getElementById(`offer-input-${ticketId}`).value; const price = parseInt(priceRaw.replace(/\D/g, ''), 10); const currentHighestBid = window.highestBids[ticketId] || 0;
    if (isNaN(price) || price < 100 || price > 500000) return alert("Lütfen 100 ₺ ile 500.000 ₺ arasında geçerli bir tutar girin.");
    if (price <= currentHighestBid) return alert(`Teklifiniz reddedildi! Sisteme daha önce ${currentHighestBid.toLocaleString('tr-TR')} ₺ teklif verilmiş.`);
    if(!confirm(`Müşteriye cihazı satın almak için ${price.toLocaleString('tr-TR')} ₺ teklif göndermek istediğinize emin misiniz?`)) return;
    
    try {
        const ticketRef = doc(db, "tickets", ticketId); const ticketSnap = await getDoc(ticketRef);
        if (ticketSnap.exists()) {
            let currentOffers = ticketSnap.data().offers || {}; currentOffers[window.currentServiceEmail] = price; 
            await updateDoc(ticketRef, { offers: currentOffers });
            await addDoc(collection(db, "notifications"), { userEmail: customerEmail, message: `🤝 Cihazınız için ${price.toLocaleString('tr-TR')} ₺ yeni bir teklif geldi!`, link: "dashboard.html", read: false, createdAt: serverTimestamp() });
            sendEmailNotification(customerEmail, "TeknikZeka: Cihazınıza Yeni Teklif Geldi!", `Merhaba, arızalı cihazınız için ${window.currentServiceEmail} servisi size ${price.toLocaleString('tr-TR')} ₺ teklif sundu.`);
            alert("Teklifiniz başarıyla müşteriye iletildi!");
        }
    } catch (error) { console.error("Hata:", error); alert("Teklif gönderilirken hata oluştu."); }
};