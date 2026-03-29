// js/service.js
import { db, auth } from './firebase-config.js';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { deviceData } from './deviceData.js';

const techServiceEmails = ["servis@teknikzeka.app", "admin@test.com"];
const listContainer = document.getElementById('service-ticket-list'); 
const ticketCountEl = document.getElementById('ticket-count');

const filterType = document.getElementById('filter-type');
const filterBrand = document.getElementById('filter-brand');
const filterModel = document.getElementById('filter-model');
const filterStatus = document.getElementById('filter-status');

let allTickets = []; 
let currentServiceEmail = "";

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

// --- YARDIMCI FONKSİYON: YAPAY ZEKA GÖRSEL KARTI ---
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
            <div class="ai-detail-row"><span class="ai-detail-icon">🔍</span><div><span style="font-size: 0.85rem; color: var(--gray-light);">Olası Arıza</span><br><strong style="color: var(--text-main);">${ariza}</strong></div></div>
            <div class="ai-detail-row"><span class="ai-detail-icon">⚙️</span><div style="width: 100%;"><div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--gray-light);"><span>Tamir Zorluk Derecesi</span><strong>${zorluk}/10</strong></div><div class="difficulty-track"><div class="difficulty-fill" style="width: ${zorluk * 10}%; background-color: ${barColor};"></div></div></div></div>
            <div class="ai-detail-row"><span class="ai-detail-icon">💡</span><div><span style="font-size: 0.85rem; color: var(--gray-light);">Önerilen Çözüm</span><br><span style="color: var(--text-main); font-size: 0.95rem;">${cozum}</span></div></div>
        </div>
    `;
}

// --- FİLTRELERİ OTOMATİK DOLDURMA ---
const initServiceCategories = () => {
    if(!filterType) return;
    filterType.innerHTML = '<option value="Tümü">Tümü</option>';
    Object.keys(deviceData).forEach(category => {
        filterType.appendChild(new Option(category, category));
    });
};
initServiceCategories();

// --- VERİ ÇEKME VE LİSTELEME ---
onAuthStateChanged(auth, (user) => {
    if (user && techServiceEmails.includes(user.email)) {
        currentServiceEmail = user.email;
        const qAll = query(collection(db, "tickets"));
        onSnapshot(qAll, (snapshot) => {
            allTickets = [];
            snapshot.forEach(doc => { allTickets.push({ id: doc.id, ...doc.data() }); });
            renderFilteredTickets(); 
        });
    } else { window.location.href = "login.html"; }
});

// --- FİLTRELEME OLAYLARI ---
filterType.addEventListener('change', (e) => {
    const type = e.target.value; 
    filterBrand.innerHTML = '<option value="Tümü">Tümü</option>'; 
    filterModel.innerHTML = '<option value="Tümü">Tümü</option>'; 
    filterModel.disabled = true;
    
    if (type !== "Tümü" && deviceData[type]) { 
        Object.keys(deviceData[type]).forEach(brand => filterBrand.appendChild(new Option(brand, brand))); 
        filterBrand.disabled = false; 
    } else { 
        filterBrand.disabled = true; 
    }
    renderFilteredTickets();
});

filterBrand.addEventListener('change', (e) => {
    const type = filterType.value; 
    const brand = e.target.value; 
    filterModel.innerHTML = '<option value="Tümü">Tümü</option>';
    
    if (brand !== "Tümü" && deviceData[type] && deviceData[type][brand]) { 
        deviceData[type][brand].forEach(model => filterModel.appendChild(new Option(model, model))); 
        filterModel.disabled = false; 
    } else { 
        filterModel.disabled = true; 
    }
    renderFilteredTickets();
});

filterModel.addEventListener('change', renderFilteredTickets);
filterStatus.addEventListener('change', renderFilteredTickets);

// --- EKRANA ÇİZME (RENDER) ---
function renderFilteredTickets() {
    listContainer.innerHTML = ''; 
    const filtered = allTickets.filter(ticket => {
        const matchType = filterType.value === "Tümü" || ticket.deviceType === filterType.value;
        const matchBrand = filterBrand.value === "Tümü" || ticket.deviceBrand === filterBrand.value;
        const matchModel = filterModel.value === "Tümü" || ticket.deviceModel === filterModel.value;
        
        let matchStatus = true;
        if (filterStatus.value === "Bekliyor") matchStatus = !ticket.assignedService;
        else if (filterStatus.value === "Bana Atananlar") matchStatus = ticket.assignedService === currentServiceEmail;
        
        return matchType && matchBrand && matchModel && matchStatus;
    });

    ticketCountEl.innerText = `${filtered.length} Kayıt`;
    if (filtered.length === 0) { listContainer.innerHTML = `<p style="color: var(--gray-light);">Filtrelere uygun kayıt yok.</p>`; return; }

    filtered.forEach(data => {
        const deviceInfo = data.deviceBrand ? `${data.deviceType} - ${data.deviceBrand} ${data.deviceModel}` : data.deviceType;
        const shortDesc = data.description.length > 60 ? data.description.substring(0, 60) + "..." : data.description;

        let techActionHtml = '';
        if (data.assignedService === currentServiceEmail) { techActionHtml = `<div class="success-box-dynamic">✅ Müşteri sizi seçti! Mail: <strong>${data.userEmail}</strong> üzerinden iletişime geçin.</div>`; } 
        else if (data.assignedService) { techActionHtml = `<div class="error-box-dynamic">❌ Müşteri başka servisi seçti.</div>`; } 
        else if (data.interestedServices && data.interestedServices.includes(currentServiceEmail)) { techActionHtml = `<div class="info-box-dynamic">⏳ Müşterinin seçimi bekleniyor...</div>`; } 
        else { techActionHtml = `<button onclick="window.approveTicket('${data.id}', event)" style="background: var(--primary); color: white; padding: 10px 20px; font-weight: 600; font-size: 1rem; border:none; border-radius: 8px; cursor: pointer; transition: 0.2s;">Ben Yapabilirim 🛠️</button>`; }

        const bar = document.createElement('div');
        bar.className = 'service-list-bar';
        
        bar.innerHTML = `
            <div class="bar-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div style="display: flex; align-items: center; gap: 15px; flex-grow: 1; overflow: hidden;">
                    <span style="font-size: 1.8rem;">📱</span>
                    <div style="overflow: hidden;">
                        <div class="bar-title">
                            ${deviceInfo} 
                            <span style="font-size: 0.8rem; color: #94A3B8; font-weight: normal; margin-left: 8px;">ID: #${data.id.slice(0,6).toUpperCase()}</span>
                        </div>
                        <div class="bar-summary">${shortDesc}</div>
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

// --- ONAY FONKSİYONU ---
window.approveTicket = async (ticketId, event) => {
    event.stopPropagation(); 
    try { await updateDoc(doc(db, "tickets", ticketId), { interestedServices: arrayUnion(currentServiceEmail) }); alert("Cihazı yapabileceğinizi onayladınız. Müşteriye iletildi!"); } 
    catch (error) { console.error("Hata:", error); }
};