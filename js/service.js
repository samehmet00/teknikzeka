// js/service.js
import { db, auth } from './firebase-config.js';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp, where, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { deviceData } from './deviceData.js';

// --- OTOMATİK E-POSTA GÖNDERME FONKSİYONU ---
async function sendEmailNotification(toEmail, subject, message) {
    try {
        const q = query(collection(db, "users"), where("email", "==", toEmail));
        const querySnapshot = await getDocs(q);
        let wantsEmail = true; 
        
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            if (userData.notifEmail === false) wantsEmail = false; 
        }

        if (wantsEmail) {
            await emailjs.send(
                "service_u85t58o",   // KENDİ SERVICE ID'Nİ YAZ
                "template_0a4enu5",  // KENDİ TEMPLATE ID'Nİ YAZ
                { to_email: toEmail, subject: subject, message: message }, 
                "_P1jn1r_0u2nA33Q3"    // KENDİ PUBLIC KEY'İNİ YAZ
            );
        }
    } catch (err) { console.error("Mail gönderme hatası:", err); }
}

const listContainer = document.getElementById('service-ticket-list'); 
const ticketCountEl = document.getElementById('ticket-count');
const navAuthMenu = document.getElementById('nav-auth-menu');

// --- HATA VEREN ESKİ FİLTRELERİ KALDIRDIK, YERİNE AŞAĞIDAKİLERİ KOYDUK ---
let allTickets = []; 
window.highestBids = {}; 

window.formatPrice = (input) => {
    let val = input.value.replace(/\D/g, ''); 
    if (val === '') { input.value = ''; return; }
    input.value = parseInt(val, 10).toLocaleString('tr-TR');
};

function formatAIReport(aiText) {
    if (!aiText) return '';
    let cleanText = aiText.replace(/\*/g, '');
    let ariza = "Bilinmiyor", zorluk = 5, cozum = "Belirtilmedi";
    cleanText.split('\n').forEach(line => {
        if(line.toLowerCase().includes('arıza:')) ariza = line.split(':')[1]?.trim();
        if(line.toLowerCase().includes('zorluk:')) zorluk = parseInt(line.split(':')[1]?.trim().replace(/\D/g,'')) || 5;
        if(line.toLowerCase().includes('çözüm:')) cozum = line.split(':')[1]?.trim();
    });
    let barColor = "#10B981"; if(zorluk >= 4 && zorluk <= 7) barColor = "#F59E0B"; if(zorluk >= 8) barColor = "#EF4444"; 
    return `
        <div class="premium-ai-box">
            <h4 style="color: #3B82F6; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
                AI Ön Teşhis Raporu
            </h4>
            <div class="ai-detail-row"><span class="ai-detail-icon">🔍</span><div><span style="font-size: 0.85rem; color: var(--gray-light);">Olası Durum</span><br><strong style="color: var(--text-main);">${ariza}</strong></div></div>
            <div class="ai-detail-row"><span class="ai-detail-icon">⚙️</span><div style="width: 100%;"><div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--gray-light);"><span>Zorluk/Risk</span><strong>${zorluk}/10</strong></div><div class="difficulty-track"><div class="difficulty-fill" style="width: ${zorluk * 10}%; background-color: ${barColor};"></div></div></div></div>
            <div class="ai-detail-row"><span class="ai-detail-icon">💡</span><div><span style="font-size: 0.85rem; color: var(--gray-light);">Tavsiye</span><br><span style="color: var(--text-main); font-size: 0.95rem;">${cozum}</span></div></div>
        </div>
    `;
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "servis") {
            window.currentServiceEmail = user.email;
            const companyName = userDoc.data().companyName || "Servis";

            if (navAuthMenu) {
                navAuthMenu.innerHTML = `
                    <div class="profile-dropdown" id="profile-dropdown-container">
                        <span class="user-name-text" style="color: var(--text-main); font-weight: bold; font-size: 1rem;">&nbsp;&nbsp;🛠️ ${companyName}</span>
                        <button class="three-dots-btn" title="Menü">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>
                        <div class="profile-dropdown-content">
                            <a href="../index.html">🏠 ⏐ Ana Sayfa</a>
                            <a href="../pages/profile.html">👤 ⏐ Profilim</a>
                            <a href="../pages/settings.html">⚙️ ⏐ Ayarlar</a>
                        </div>
                        <div class="nav-divider"></div>
                    </div>
                    <button id="home-logout-btn" class="logout-icon-btn" title="Çıkış Yap" style="margin-left: 5px;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </button>
                `;

                const dropdownContainer = document.getElementById('profile-dropdown-container');
                dropdownContainer.addEventListener('click', (e) => { e.stopPropagation(); dropdownContainer.classList.toggle('open'); });
                document.addEventListener('click', () => { if (dropdownContainer) dropdownContainer.classList.remove('open'); });
                
                document.getElementById('home-logout-btn').addEventListener('click', (e) => { 
                    e.stopPropagation(); signOut(auth).then(() => { window.location.href = "login.html"; }); 
                });
            }

            const notiQ = query(collection(db, "notifications"), where("userEmail", "==", user.email), where("read", "==", false));
            onSnapshot(notiQ, (snapshot) => {
                const badge = document.getElementById('noti-badge');
                if(badge) {
                    if(snapshot.empty) { badge.style.display = 'none'; } 
                    else { badge.style.display = 'flex'; badge.innerText = snapshot.size; }
                }
            });

            // TALEPLERİ ÇEK
            const qAll = query(collection(db, "tickets"));
            onSnapshot(qAll, (snapshot) => {
                allTickets = [];
                snapshot.forEach(document => { allTickets.push({ id: document.id, ...document.data() }); });
                
                // Yeniden eskiye sırala
                allTickets.sort((a, b) => {
                    const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                    const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                    return dateB - dateA;
                });
                
                renderTickets(); 
            });
        } else {
            window.location.href = "dashboard.html";
        }
    } else { window.location.href = "login.html"; }
});


function renderTickets() {
    listContainer.innerHTML = ''; 
    
    // TAB FİLTRELEME MANTIĞI
    let filtered = allTickets.filter(ticket => {
        if (window.currentServiceTab === 'aktif') {
            return ticket.assignedService === window.currentServiceEmail;
        } else {
            // Havuz (Bekleyen işler veya herkesin görebileceği işler)
            return true; 
        }
    });

    if(ticketCountEl) ticketCountEl.innerText = `${filtered.length} Kayıt`;
    
    if (filtered.length === 0) { 
        listContainer.innerHTML = `<p style="color: var(--gray-light); text-align:center; padding: 2rem;">Kayıt bulunamadı.</p>`; 
        
        // Aktif iş sayısını 0 yap
        const activeBadge = document.getElementById('service-active-badge');
        if(activeBadge) activeBadge.style.display = 'none';
        return; 
    }

    filtered.forEach(data => {
        const deviceInfo = data.deviceBrand ? `${data.deviceType} - ${data.deviceBrand} ${data.deviceModel}` : data.deviceType;
        
        let dateStr = "Şimdi eklendi";
        if(data.createdAt) {
            const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });
        }

        let techActionHtml = '';
        let highestBidHtml = '';
        let saleBadge = '';
        
        if (data.isForSale) {
            let highestBid = 0;
            
            if (data.offers && typeof data.offers === 'object') {
                Object.values(data.offers).forEach(val => {
                    let priceNumber = (typeof val === 'object' && val !== null) ? Number(val.price) : Number(val);
                    if (!isNaN(priceNumber) && priceNumber > highestBid) {
                        highestBid = priceNumber;
                    }
                });
            }
            
            window.highestBids[data.id] = highestBid; 

            saleBadge = `<span style="color:#10B981; border:1px solid #10B981; padding:2px 6px; border-radius:4px; font-size:0.75rem;">SATILIK</span>`;
            
            if(highestBid > 0) {
                saleBadge += `<span class="highest-bid-badge">💰 Teklif: ${highestBid.toLocaleString('tr-TR')} ₺</span>`;
            } else {
                saleBadge += `<span class="highest-bid-badge" style="background: rgba(16, 185, 129, 0.1); color: #10B981; border: 1px dashed #10B981; box-shadow: none;">Bekleniyor</span>`;
            }

            if (data.status === "Satıldı") {
                if (data.assignedService === window.currentServiceEmail) {
                    techActionHtml = `
                    <div class="success-box-dynamic" style="display:flex; flex-direction:column; gap:10px;">
                        <span>🎉 Teklifiniz Kabul Edildi! Müşteri İletişim: <strong>${data.userEmail}</strong></span>
                        <a href="track.html?id=${data.id}" style="align-self:flex-start; padding:8px 20px; background: var(--primary); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Süreci Yönet ⚙️</a>
                    </div>`;
                } else {
                    techActionHtml = `<div class="error-box-dynamic">❌ Cihaz başka bir servise satıldı.</div>`;
                }
            } else {
                let myOfferRaw = data.offers ? data.offers[window.currentServiceEmail] : null;
                let myOffer = (typeof myOfferRaw === 'object' && myOfferRaw !== null) ? Number(myOfferRaw.price) : Number(myOfferRaw);
                if (isNaN(myOffer)) myOffer = 0;
                
                const minOfferAllowed = highestBid > 0 ? highestBid + 10 : 100; 

                const offerInputHtml = `
                    <div style="display:flex; align-items:center; gap:10px; margin-top:10px; background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 8px; border: 1px dashed #10B981;">
                        <span style="font-weight: 800; color: #10B981; font-size: 1.2rem;">₺</span>
                        <input type="text" id="offer-input-${data.id}" oninput="window.formatPrice(this)" placeholder="Teklif girin (Örn: ${minOfferAllowed})" value="${myOffer ? myOffer.toLocaleString('tr-TR') : ''}" style="flex:1; padding:8px; border-radius:6px; border:1px solid var(--border-color); background:transparent; color:var(--text-main); font-size: 1rem; outline:none;" onclick="event.stopPropagation();">
                        <button onclick="window.makeOffer('${data.id}', '${data.userEmail}', event)" style="background:#10B981; color:white; padding:8px 20px; font-weight:bold; font-size: 1rem; border:none; border-radius:6px; cursor:pointer; transition: 0.2s;">${myOffer ? 'Güncelle' : 'Teklif Gönder'}</button>
                    </div>`;

                if (myOffer) {
                    techActionHtml = `
                        <div id="offer-display-${data.id}" style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10B981; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top:10px;">
                            <span style="color: var(--text-main);">✅ <strong>${myOffer.toLocaleString('tr-TR')} ₺</strong> teklif verdiniz.</span>
                            <button onclick="event.stopPropagation(); document.getElementById('offer-display-${data.id}').style.display='none'; document.getElementById('offer-edit-${data.id}').style.display='block';" style="background: transparent; border: 1px solid #10B981; color: #10B981; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer;">Değiştir</button>
                        </div>
                        <div id="offer-edit-${data.id}" style="display: none;">
                            ${offerInputHtml}
                        </div>`;
                } else {
                    techActionHtml = offerInputHtml;
                }
            }
        } 
        else {
            saleBadge = `<span style="color:var(--primary); border:1px solid var(--primary); padding:2px 6px; border-radius:4px; font-size:0.75rem;">TAMİR</span>`;
            if (data.assignedService === window.currentServiceEmail) { 
                techActionHtml = `
                <div class="success-box-dynamic" style="display:flex; flex-direction:column; gap:10px;">
                    <span>✅ Müşteri sizi seçti! Mail: <strong>${data.userEmail}</strong></span>
                    <a href="track.html?id=${data.id}" style="align-self:flex-start; padding:8px 20px; background: var(--primary); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Süreci Yönet ⚙️</a>
                </div>`; 
            } 
            else if (data.assignedService) { techActionHtml = `<div class="error-box-dynamic">❌ Müşteri başka servisi seçti.</div>`; } 
            else if (data.interestedServices && data.interestedServices.includes(window.currentServiceEmail)) { techActionHtml = `<div class="info-box-dynamic">⏳ Müşterinin seçimi bekleniyor...</div>`; } 
            else { techActionHtml = `<button onclick="window.approveTicket('${data.id}', '${data.userEmail}', event)" style="background: var(--primary); color: white; padding: 10px 20px; font-weight: 600; font-size: 1rem; border:none; border-radius: 8px; cursor: pointer; transition: 0.2s;">Ben Yapabilirim 🛠️</button>`; }
        }

        const bar = document.createElement('div');
        bar.className = 'service-list-bar ticket-wrapper'; // TAB sistemi için ticket-wrapper classı eklendi
        
        bar.innerHTML = `
            <div class="bar-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div style="display: flex; align-items: flex-start; gap: 15px; flex-grow: 1; overflow: hidden;">
                    <span style="font-size: 1.8rem;">📱</span>
                    <div style="overflow: hidden; width: 100%;">
                        <div class="bar-title">
                            ${deviceInfo} ${saleBadge}
                        </div>
                        <div class="bar-summary">
                            <span class="ticket-date-badge">📅 ${dateStr}</span>
                            <span class="ticket-desc-text">${data.description.substring(0, 50)}${data.description.length > 50 ? '...' : ''}</span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 20px;">
                    <span style="font-size: 0.85rem; color: ${data.status === 'Bekliyor' ? '#F59E0B' : '#10B981'}; font-weight: bold; background: rgba(0,0,0,0.05); padding: 4px 10px; border-radius: 20px; white-space: nowrap;">${data.status}</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            
            <div class="bar-details">
                <div style="display: flex; flex-direction: column; gap: 15px; padding-bottom: 10px;">
                    <div><span style="color: var(--gray-light); font-size: 0.9rem;">Müşteri E-Posta:</span><br><strong>${data.userEmail}</strong></div>
                    <div><span style="color: var(--gray-light); font-size: 0.9rem;">Detaylı Şikayet:</span><br><span>${data.description}</span></div>
                    ${formatAIReport(data.aiReport)}
                    <div style="margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 15px;">${techActionHtml}</div>
                </div>
            </div>
        `;
        listContainer.appendChild(bar);
    });

    // Aktif İşler Rozeti Güncelleme
    let activeCount = allTickets.filter(t => t.assignedService === window.currentServiceEmail).length;
    const activeBadge = document.getElementById('service-active-badge');
    if(activeBadge) {
        if(activeCount > 0) { activeBadge.style.display = 'inline-block'; activeBadge.innerText = activeCount; }
        else { activeBadge.style.display = 'none'; }
    }
}

// --- GLOBAL (WİNDOW) FONKSİYONLARI ---

// YENİ: TAB SİSTEMİ MANTIĞINI BURAYA TAŞIDIK (HTML içinden çağırmak yerine)
window.currentServiceTab = 'havuz'; 
window.switchServiceTab = (tabName, event) => {
    window.currentServiceTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(event) event.target.classList.add('active');
    
    renderTickets(); // Filtreye göre yeniden listeler
};

window.approveTicket = async (ticketId, customerEmail, event) => {
    event.stopPropagation(); 
    try { 
        await updateDoc(doc(db, "tickets", ticketId), { interestedServices: arrayUnion(window.currentServiceEmail) }); 
        await addDoc(collection(db, "notifications"), { userEmail: customerEmail, message: "🛠️ Bir servis cihazınızı tamir edebileceğini belirtti!", link: "dashboard.html", read: false, createdAt: serverTimestamp() });
        alert("Cihazı yapabileceğinizi onayladınız. Müşteriye iletildi!"); 
    } catch (error) { console.error("Hata:", error); }
};

window.makeOffer = async (ticketId, customerEmail, event) => {
    event.stopPropagation();
    const priceRaw = document.getElementById(`offer-input-${ticketId}`).value;
    const price = parseInt(priceRaw.replace(/\D/g, ''), 10); 
    const currentHighestBid = window.highestBids[ticketId] || 0;
    
    if (isNaN(price) || price < 100 || price > 500000) {
        return alert("Lütfen 100 ₺ ile 500.000 ₺ arasında geçerli bir tutar girin.");
    }

    if (price <= currentHighestBid) {
        return alert(`Teklifiniz reddedildi! Sisteme daha önce ${currentHighestBid.toLocaleString('tr-TR')} ₺ teklif verilmiş. Bunun üzerinde bir rakam girmelisiniz.`);
    }
    
    if(!confirm(`Müşteriye cihazı satın almak için ${price.toLocaleString('tr-TR')} ₺ teklif göndermek istediğinize emin misiniz?`)) return;
    
    try {
        const ticketRef = doc(db, "tickets", ticketId);
        const ticketSnap = await getDoc(ticketRef);
        
        if (ticketSnap.exists()) {
            let currentOffers = ticketSnap.data().offers || {};
            currentOffers[window.currentServiceEmail] = price; 
            
            await updateDoc(ticketRef, { offers: currentOffers });
            
            await addDoc(collection(db, "notifications"), { userEmail: customerEmail, message: `💸 Cihazınız için ${price.toLocaleString('tr-TR')} ₺ yeni bir teklif geldi!`, link: "dashboard.html", read: false, createdAt: serverTimestamp() });
            
            sendEmailNotification(
                customerEmail, 
                "TeknikZeka: Cihazınıza Yeni Teklif Geldi!", 
                `Merhaba, arızalı cihazınız için ${window.currentServiceEmail} servisi size ${price.toLocaleString('tr-TR')} ₺ teklif sundu. Kabul etmek veya incelemek için TeknikZeka paneline giriş yapabilirsiniz.`
            );

            alert("Teklifiniz başarıyla müşteriye iletildi!");
        }
    } catch (error) { 
        console.error("Hata:", error); 
        alert("Teklif gönderilirken bir hata oluştu.");
    }
};