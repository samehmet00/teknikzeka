// js/service.js
import { db, auth } from './firebase-config.js';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { deviceData } from './deviceData.js';

const techServiceEmails = ["servis@teknikzeka.app", "admin@test.com"];
const listContainer = document.getElementById('service-ticket-list'); 
const ticketCountEl = document.getElementById('ticket-count');

const filterType = document.getElementById('filter-type');
const filterBrand = document.getElementById('filter-brand');
const filterModel = document.getElementById('filter-model');
const filterStatus = document.getElementById('filter-status');
const filterSale = document.getElementById('filter-sale');
const filterDate = document.getElementById('filter-date'); 

let allTickets = []; 

// --- YENİ: OTOMATİK BİNLİK AYRAÇ (SAHİBİNDEN STİLİ) ---
window.formatPrice = (input) => {
    let val = input.value.replace(/\D/g, ''); 
    if (val === '') { input.value = ''; return; }
    input.value = parseInt(val, 10).toLocaleString('tr-TR');
};

// --- TEMA VE ÇIKIŞ ---
const themeBtn = document.getElementById('theme-toggle-btn');
if (localStorage.getItem('theme') === 'light') { document.body.classList.add('light-mode'); themeBtn.innerText = '🌙'; }
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    if (document.body.classList.contains('light-mode')) { themeBtn.innerText = '🌙'; localStorage.setItem('theme', 'light'); } 
    else { themeBtn.innerText = '☀️'; localStorage.setItem('theme', 'dark'); }
});

document.getElementById('service-logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => { window.location.href = "login.html"; });
});

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

const initServiceCategories = () => {
    if(!filterType) return;
    filterType.innerHTML = '<option value="Tümü">Tümü</option>';
    Object.keys(deviceData).forEach(category => { filterType.appendChild(new Option(category, category)); });
};
initServiceCategories();

onAuthStateChanged(auth, (user) => {
    if (user && techServiceEmails.includes(user.email)) {
        window.currentServiceEmail = user.email; // Global olarak atadık

        // YENİ: BİLDİRİM SAYACI
        const notiQ = query(collection(db, "notifications"), where("userEmail", "==", user.email), where("read", "==", false));
        onSnapshot(notiQ, (snapshot) => {
            const badge = document.getElementById('noti-badge');
            if(badge) {
                if(snapshot.empty) { badge.style.display = 'none'; } 
                else { badge.style.display = 'flex'; badge.innerText = snapshot.size; }
            }
        });

        const qAll = query(collection(db, "tickets"));
        onSnapshot(qAll, (snapshot) => {
            allTickets = [];
            snapshot.forEach(doc => { allTickets.push({ id: doc.id, ...doc.data() }); });
            renderFilteredTickets(); 
        });
    } else { window.location.href = "login.html"; }
});

filterType.addEventListener('change', (e) => {
    const type = e.target.value; 
    filterBrand.innerHTML = '<option value="Tümü">Tümü</option>'; 
    filterModel.innerHTML = '<option value="Tümü">Tümü</option>'; 
    filterModel.disabled = true;
    if (type !== "Tümü" && deviceData[type]) { 
        Object.keys(deviceData[type]).forEach(brand => filterBrand.appendChild(new Option(brand, brand))); 
        filterBrand.disabled = false; 
    } else { filterBrand.disabled = true; }
    renderFilteredTickets();
});

filterBrand.addEventListener('change', (e) => {
    const type = filterType.value; 
    const brand = e.target.value; 
    filterModel.innerHTML = '<option value="Tümü">Tümü</option>';
    if (brand !== "Tümü" && deviceData[type] && deviceData[type][brand]) { 
        deviceData[type][brand].forEach(model => filterModel.appendChild(new Option(model, model))); 
        filterModel.disabled = false; 
    } else { filterModel.disabled = true; }
    renderFilteredTickets();
});

filterModel.addEventListener('change', renderFilteredTickets);
filterStatus.addEventListener('change', renderFilteredTickets);
if(filterSale) filterSale.addEventListener('change', renderFilteredTickets);
if(filterDate) filterDate.addEventListener('change', renderFilteredTickets);

function renderFilteredTickets() {
    listContainer.innerHTML = ''; 
    let filtered = allTickets.filter(ticket => {
        const matchType = filterType.value === "Tümü" || ticket.deviceType === filterType.value;
        const matchBrand = filterBrand.value === "Tümü" || ticket.deviceBrand === filterBrand.value;
        const matchModel = filterModel.value === "Tümü" || ticket.deviceModel === filterModel.value;
        let matchStatus = true;
        if (filterStatus.value === "Bekliyor") matchStatus = !ticket.assignedService;
        else if (filterStatus.value === "Bana Atananlar") matchStatus = ticket.assignedService === window.currentServiceEmail;
        
        let matchSale = true;
        if (filterSale) {
            if (filterSale.value === "Sadece Satılık") matchSale = ticket.isForSale === true;
            else if (filterSale.value === "Sadece Tamir") matchSale = !ticket.isForSale;
        }
        return matchType && matchBrand && matchModel && matchStatus && matchSale;
    });

    if (filterDate) {
        filtered.sort((a, b) => {
            const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return filterDate.value === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }

    ticketCountEl.innerText = `${filtered.length} Kayıt`;
    if (filtered.length === 0) { listContainer.innerHTML = `<p style="color: var(--gray-light);">Filtrelere uygun kayıt yok.</p>`; return; }

    filtered.forEach(data => {
        const deviceInfo = data.deviceBrand ? `${data.deviceType} - ${data.deviceBrand} ${data.deviceModel}` : data.deviceType;
        const shortDesc = data.description.length > 60 ? data.description.substring(0, 60) + "..." : data.description;
        const saleBadge = data.isForSale ? `<span style="color:#10B981; font-size:0.8rem; border:1px solid #10B981; padding:2px 6px; border-radius:4px; margin-left:8px;">Satılık</span>` : ``;

        let dateStr = "Şimdi eklendi";
        if(data.createdAt) {
            const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        }

        let techActionHtml = '';
        
        if (data.isForSale) {
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
                let myOffer = data.offers ? data.offers[window.currentServiceEmail] : null;
                if (typeof myOffer === 'object') myOffer = myOffer.price || 0;
                
                // input type="text" VE oninput="window.formatPrice(this)" ÖZELLİĞİ EKLENDİ
                const offerInputHtml = `
                    <div style="display:flex; align-items:center; gap:10px; margin-top:10px; background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 8px; border: 1px dashed #10B981;">
                        <span style="font-weight: 800; color: #10B981; font-size: 1.2rem;">₺</span>
                        <input type="text" id="offer-input-${data.id}" oninput="window.formatPrice(this)" placeholder="Teklif girin (Örn: 1.500)" value="${myOffer ? Number(myOffer).toLocaleString('tr-TR') : ''}" style="flex:1; padding:8px; border-radius:6px; border:1px solid var(--border-color); background:transparent; color:var(--text-main); font-size: 1rem; outline:none;" onclick="event.stopPropagation();">
                        <button onclick="window.makeOffer('${data.id}', '${data.userEmail}', event)" style="background:#10B981; color:white; padding:8px 20px; font-weight:bold; font-size: 1rem; border:none; border-radius:6px; cursor:pointer; transition: 0.2s;">${myOffer ? 'Güncelle' : 'Teklif Gönder'}</button>
                    </div>`;

                if (myOffer) {
                    techActionHtml = `
                        <div id="offer-display-${data.id}" style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10B981; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top:10px;">
                            <span style="color: var(--text-main);">✅ <strong>${Number(myOffer).toLocaleString('tr-TR')} ₺</strong> teklif verdiniz.</span>
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
        bar.className = 'service-list-bar';
        
        bar.innerHTML = `
            <div class="bar-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div style="display: flex; align-items: center; gap: 15px; flex-grow: 1; overflow: hidden;">
                    <span style="font-size: 1.8rem;">📱</span>
                    <div style="overflow: hidden;">
                        <div class="bar-title">
                            ${deviceInfo} ${saleBadge}
                        </div>
                        <div class="bar-summary">
                            <span style="font-size: 0.8rem; color: #94A3B8; font-weight: normal; margin-right: 10px;">📅 ${dateStr}</span>
                            ${shortDesc}
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 20px;">
                    <span style="font-size: 0.85rem; color: ${data.status === 'Bekliyor' ? '#F59E0B' : '#10B981'}; font-weight: bold; background: rgba(0,0,0,0.05); padding: 4px 10px; border-radius: 20px;">${data.status}</span>
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
}

window.approveTicket = async (ticketId, customerEmail, event) => {
    event.stopPropagation(); 
    try { 
        await updateDoc(doc(db, "tickets", ticketId), { interestedServices: arrayUnion(window.currentServiceEmail) }); 
        
        // MÜŞTERİYE BİLDİRİM GÖNDER
        await addDoc(collection(db, "notifications"), { userEmail: customerEmail, message: "🛠️ Bir servis cihazınızı tamir edebileceğini belirtti!", link: "dashboard.html", read: false, createdAt: serverTimestamp() });
        
        alert("Cihazı yapabileceğinizi onayladınız. Müşteriye iletildi!"); 
    } catch (error) { console.error("Hata:", error); }
};

window.makeOffer = async (ticketId, customerEmail, event) => {
    event.stopPropagation();
    const priceRaw = document.getElementById(`offer-input-${ticketId}`).value;
    const price = parseInt(priceRaw.replace(/\D/g, ''), 10); // Noktaları silip saf sayıya çeviriyoruz
    
    if (isNaN(price) || price < 100 || price > 500000) {
        return alert("Lütfen 100 ₺ ile 500.000 ₺ arasında geçerli bir tutar girin.");
    }
    
    if(!confirm(`Müşteriye cihazı satın almak için ${price.toLocaleString('tr-TR')} ₺ teklif göndermek istediğinize emin misiniz?`)) return;
    
    try {
        await updateDoc(doc(db, "tickets", ticketId), { [`offers.${window.currentServiceEmail}`]: price });
        
        // MÜŞTERİYE BİLDİRİM GÖNDER
        await addDoc(collection(db, "notifications"), { userEmail: customerEmail, message: `💸 Cihazınız için ${price.toLocaleString('tr-TR')} ₺ yeni bir teklif geldi!`, link: "dashboard.html", read: false, createdAt: serverTimestamp() });

        alert("Teklifiniz başarıyla müşteriye iletildi!");
    } catch (error) { console.error("Hata:", error); }
};