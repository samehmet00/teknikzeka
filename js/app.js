// js/app.js
import { db, auth } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { deviceData } from './deviceData.js';

const GEMINI_API_KEY = "AIzaSyAtQ_JMwbBK2-N-XcKVPZQ4E7lkgCS9Dkk"; 

const ticketForm = document.getElementById('ticket-form');
const deviceTypeInput = document.getElementById('device-type');
const deviceBrandInput = document.getElementById('device-brand');
const deviceModelInput = document.getElementById('device-model');
const issueDescInput = document.getElementById('issue-desc');
const ticketMsg = document.getElementById('ticket-msg');
const ticketList = document.getElementById('ticket-list');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const navAuthMenu = document.getElementById('nav-auth-menu');

// --- TEMA DEĞİŞTİRME ---
if (themeToggleBtn) {
    if (localStorage.getItem('theme') === 'light') { document.body.classList.add('light-mode'); themeToggleBtn.innerText = '🌙'; } 
    else { themeToggleBtn.innerText = '☀️'; }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        if (document.body.classList.contains('light-mode')) { themeToggleBtn.innerText = '🌙'; localStorage.setItem('theme', 'light'); } 
        else { themeToggleBtn.innerText = '☀️'; localStorage.setItem('theme', 'dark'); }
    });
}

// --- DİNAMİK DROPDOWN YÖNETİMİ ---
const initCategories = () => {
    if(!deviceTypeInput) return;
    deviceTypeInput.innerHTML = '<option value="">Cihaz Kategorisi Seçin</option>';
    Object.keys(deviceData).forEach(category => deviceTypeInput.appendChild(new Option(category, category)));
};
initCategories(); 

if(deviceTypeInput) {
    deviceTypeInput.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        deviceBrandInput.innerHTML = '<option value="">Marka Seçin</option>';
        deviceModelInput.innerHTML = '<option value="">Model Seçin</option>';
        deviceModelInput.disabled = true; 
        if (selectedType && deviceData[selectedType]) {
            Object.keys(deviceData[selectedType]).forEach(brand => deviceBrandInput.appendChild(new Option(brand, brand)));
            deviceBrandInput.disabled = false; 
        } else {
            deviceBrandInput.disabled = true; 
        }
    });

    deviceBrandInput.addEventListener('change', (e) => {
        const selectedType = deviceTypeInput.value;
        const selectedBrand = e.target.value;
        deviceModelInput.innerHTML = '<option value="">Model Seçin</option>';
        if (selectedBrand && deviceData[selectedType] && deviceData[selectedType][selectedBrand]) {
            deviceData[selectedType][selectedBrand].forEach(model => deviceModelInput.appendChild(new Option(model, model)));
            deviceModelInput.disabled = false; 
        } else {
            deviceModelInput.disabled = true; 
        }
    });
}

// --- YARDIMCI FONKSİYON: YAPAY ZEKA METNİNİ GÖRSEL KARTA ÇEVİRİR ---
function formatAIReport(aiText) {
    if (!aiText) return '';
    let cleanText = aiText.replace(/\*/g, ''); 
    let ariza = "Bilinmiyor", zorluk = 5, cozum = "Belirtilmedi";
    
    cleanText.split('\n').forEach(line => {
        if(line.toLowerCase().includes('arıza:')) ariza = line.split(':')[1]?.trim();
        if(line.toLowerCase().includes('zorluk:')) zorluk = parseInt(line.split(':')[1]?.trim().replace(/\D/g,'')) || 5;
        if(line.toLowerCase().includes('çözüm:')) cozum = line.split(':')[1]?.trim();
    });

    let barColor = "#10B981"; 
    if(zorluk >= 4 && zorluk <= 7) barColor = "#F59E0B"; 
    if(zorluk >= 8) barColor = "#EF4444"; 

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

// --- VERİ EKLEME VE YAPAY ZEKÂ ANALİZ İŞLEMİ ---
if(ticketForm) {
    ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (!currentUser) return alert("Giriş yapmalısınız!");

        ticketMsg.style.display = 'block';
        ticketMsg.innerHTML = `<div style="color: var(--primary); font-weight: 600; font-size: 0.95rem;">🤖 Yapay zekâ arızayı teşhis ediyor...</div><div class="loading-bar-container"><div class="loading-bar"></div></div>`;

        try {
            const prompt = `Sen uzman bir teknik servissin. Şikayet: "${issueDescInput.value}". Cihaz: ${deviceTypeInput.value} - ${deviceBrandInput.value} ${deviceModelInput.value}.
            KESİNLİKLE selamlama veya ekstra bir açıklama cümlesi yazma. SADECE aşağıdaki 3 satırı doldur ve en fazla 20 kelime kullan:
            Arıza: [Kısa Tahmin]
            Zorluk: [1-10]
            Çözüm: [Tek cümlelik tavsiye]`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const aiData = await response.json();
            const aiAnalysis = aiData.candidates[0].content.parts[0].text;

            await addDoc(collection(db, "tickets"), {
                userEmail: currentUser.email, deviceType: deviceTypeInput.value, deviceBrand: deviceBrandInput.value, deviceModel: deviceModelInput.value, description: issueDescInput.value,
                aiReport: aiAnalysis, status: "Bekliyor", interestedServices: [], assignedService: "", createdAt: serverTimestamp() 
            });

            ticketForm.reset(); deviceBrandInput.disabled = true; deviceModelInput.disabled = true;
            ticketMsg.innerHTML = `<span style="color: #10B981; font-weight: bold;">✅ Talebiniz başarıyla kaydedildi!</span>`;
            setTimeout(() => ticketMsg.style.display = 'none', 4000);

        } catch (error) { ticketMsg.innerHTML = `<span style="color: #EF4444; font-weight: bold;">❌ Bir hata oluştu, tekrar deneyin.</span>`; }
    });
}

// --- GLOBAL İŞLEMLER ---
window.toggleSwipe = (event, element) => {
    if(event.target.tagName.toLowerCase() === 'button') return;
    document.querySelectorAll('.modern-ticket-card.swiped').forEach(el => { if(el !== element) el.classList.remove('swiped'); });
    element.classList.toggle('swiped');
};

window.deleteTicket = async (ticketId) => {
    if(confirm("Bu arıza kaydını silmek istediğinize emin misiniz?")) {
        try { await deleteDoc(doc(db, "tickets", ticketId)); } catch (error) { alert("Silinirken bir hata oluştu."); }
    }
};

window.selectService = async (ticketId, serviceEmail) => {
    try {
        await updateDoc(doc(db, "tickets", ticketId), { assignedService: serviceEmail, status: "Servise Yönlendirildi" });
        alert(serviceEmail + " servisini başarıyla seçtiniz!");
    } catch (error) { console.error("Hata:", error); }
};

// --- MÜŞTERİ PANELİ VE KAPSÜL YÖNETİMİ ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        
        // 1. KAPSÜLÜ OLUŞTUR
        if(navAuthMenu) {
            const username = user.email.split('@')[0];
            navAuthMenu.innerHTML = `
                <div class="user-profile-pill">
                    <span class="user-name-text">👤 ${username}</span>
                    <a href="index.html" class="nav-icon-btn" title="Ana Sayfaya Dön" style="width: 32px; height: 32px; border-width: 2px;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    </a>
                    <button id="logout-btn" class="logout-icon-btn" title="Sistemden Çıkış" style="width: 32px; height: 32px; border-width: 2px;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </button>
                </div>
            `;
            
            document.getElementById('logout-btn').addEventListener('click', () => {
                signOut(auth).then(() => { window.location.reload(); });
            });
        }

        // 2. BİLETLERİ LİSTELE
        if(ticketList) {
            const q = query(collection(db, "tickets"), where("userEmail", "==", user.email));
            onSnapshot(q, (querySnapshot) => {
                ticketList.innerHTML = ''; 
                if(querySnapshot.empty) { ticketList.innerHTML = '<p style="color: var(--gray-light);">Henüz bir arıza kaydınız bulunmuyor.</p>'; return; }

                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const ticketId = docSnap.id; 
                    const deviceInfo = data.deviceBrand ? `${data.deviceType} - ${data.deviceBrand} ${data.deviceModel}` : data.deviceType;
                    
                    let bidHtml = '';
                    if (data.assignedService) { bidHtml = `<div class="success-box-dynamic"><strong>✅ Cihazınız <span style="text-decoration: underline;">${data.assignedService}</span> isimli servise yönlendirildi. Servis sizinle iletişime geçecektir.</strong></div>`; } 
                    else if (data.interestedServices && data.interestedServices.length > 0) {
                        bidHtml = `<div class="info-box-dynamic"><strong>🎉 Bu cihazı tamir edebilecek servisler:</strong><br>`;
                        data.interestedServices.forEach(srv => { bidHtml += `<button onclick="window.selectService('${ticketId}', '${srv}')" style="margin-top:8px; background: #10B981; padding: 5px 10px; width: auto; font-size: 0.85rem; display: block; border:none; border-radius: 6px; color:white; font-weight:bold; cursor:pointer;">${srv} - Bu Servisi Seç</button>`; });
                        bidHtml += `</div>`;
                    }

                    const statusClass = data.status === 'Bekliyor' ? 'status-bekliyor' : 'status-onaylandi';
                    const ticketWrapper = document.createElement('div');
                    ticketWrapper.className = 'ticket-wrapper';

                    ticketWrapper.innerHTML = `
                        <div class="delete-action-btn" onclick="window.deleteTicket('${ticketId}')" title="Kaydı Sil"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></div>
                        <div class="modern-ticket-card" onclick="window.toggleSwipe(event, this)">
                            <div class="modern-ticket-header">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 1.8rem; background: rgba(79, 70, 229, 0.1); border-radius: 12px; padding: 5px;">📱</span>
                                    <div><h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">${deviceInfo}</h4><span style="font-size: 0.8rem; color: #94A3B8;">Kayıt ID: #${ticketId.slice(0,6).toUpperCase()}</span></div>
                                </div>
                                <span class="status-pill ${statusClass}">${data.status}</span>
                            </div>
                            <div><p style="color: var(--text-main); font-size: 0.95rem;"><strong>Şikayet Özeti:</strong> ${data.description}</p></div>
                            ${formatAIReport(data.aiReport)}
                            ${bidHtml}
                        </div>
                    `;
                    ticketList.appendChild(ticketWrapper);
                });
            });
        }
    } else {
        // Kullanıcı giriş yapmamışsa, kapsülü boşalt
        if(navAuthMenu) navAuthMenu.innerHTML = '';
    }
});