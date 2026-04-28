// js/app.js
import { db, auth } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { deviceData } from './deviceData.js';

const keyPart1 = "AIzaSyBb37dubusQPS"; 
const keyPart2 = "bNmvQJJllhM58MySTyKls"; 
const GEMINI_API_KEY = keyPart1 + keyPart2;

const ticketForm = document.getElementById('ticket-form');
const deviceTypeInput = document.getElementById('device-type');
const deviceBrandInput = document.getElementById('device-brand');
const deviceModelInput = document.getElementById('device-model');
const issueDescInput = document.getElementById('issue-desc');
const ticketMsg = document.getElementById('ticket-msg');
const ticketList = document.getElementById('ticket-list');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const navAuthMenu = document.getElementById('nav-auth-menu');

// --- MOBİL MENÜ YÖNETİMİ ---
const menuBtn = document.getElementById('left-menu-btn');
const sidebar = document.getElementById('left-sidebar');
if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.toggle('open'); });
}
document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target)) { sidebar.classList.remove('open'); }
});

// --- TEMA DEĞİŞTİRME ---
if (themeToggleBtn) {
    if (localStorage.getItem('theme') === 'light') { document.body.classList.add('light-mode'); } 
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        if (document.body.classList.contains('light-mode')) { localStorage.setItem('theme', 'light'); } 
        else { localStorage.setItem('theme', 'dark'); }
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
        } else { deviceBrandInput.disabled = true; }
    });

    deviceBrandInput.addEventListener('change', (e) => {
        const selectedType = deviceTypeInput.value;
        const selectedBrand = e.target.value;
        deviceModelInput.innerHTML = '<option value="">Model Seçin</option>';
        if (selectedBrand && deviceData[selectedType] && deviceData[selectedType][selectedBrand]) {
            deviceData[selectedType][selectedBrand].forEach(model => deviceModelInput.appendChild(new Option(model, model)));
            deviceModelInput.disabled = false; 
        } else { deviceModelInput.disabled = true; }
    });
}

// --- YAPAY ZEKA GÖRSEL KART ---
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
            <div class="ai-detail-row"><span class="ai-detail-icon">⚙️</span><div style="width: 100%;"><div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--gray-light);"><span>Zorluk Derecesi / Risk</span><strong>${zorluk}/10</strong></div><div class="difficulty-track"><div class="difficulty-fill" style="width: ${zorluk * 10}%; background-color: ${barColor};"></div></div></div></div>
            <div class="ai-detail-row"><span class="ai-detail-icon">💡</span><div><span style="font-size: 0.85rem; color: var(--gray-light);">Tavsiye</span><br><span style="color: var(--text-main); font-size: 0.95rem;">${cozum}</span></div></div>
        </div>
    `;
}

// --- KAYIT OLUŞTURMA ---
if(ticketForm) {
    ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (!currentUser) return alert("Sisteme dahil olmanız icap eder! (Giriş yapmalısınız)");

        const isForSale = document.getElementById('is-for-sale')?.checked || false;
        ticketMsg.style.display = 'block';
        ticketMsg.innerHTML = `<div style="color: var(--primary); font-weight: 600; font-size: 0.95rem;">🤖 Yapay zekâ analiz ediyor, lütfen bekleyiniz...</div><div class="loading-bar-container"><div class="loading-bar"></div></div>`;

        try {
            let prompt = "";
            if (isForSale) {
                prompt = `Sen bir ikinci el cihaz eksperisin. Cihaz: ${deviceTypeInput.value} - ${deviceBrandInput.value} ${deviceModelInput.value}. Arızası: "${issueDescInput.value}". 
                SADECE 3 satır ve maksimum 15 kelime kullanarak şu formatta cevap ver. Açıklama yapma:
                Arıza: [Sadece arızanın adı, örn: Ekran Kırık]
                Zorluk: [Piyasa değer kaybı riski, 1-10 arası bir rakam]
                Çözüm: [Sadece 4-5 kelimelik satış tavsiyesi, örn: Yedek parça olarak satılabilir.]`;
            } else {
                prompt = `Sen uzman bir teknik servissin. Şikayet: "${issueDescInput.value}". Cihaz: ${deviceTypeInput.value} - ${deviceBrandInput.value} ${deviceModelInput.value}.
                KESİNLİKLE selamlama yazma. SADECE şu formatta cevap ver:
                Arıza: [Kısa Tahmin]
                Zorluk: [1-10]
                Çözüm: [Tek cümlelik tamir tavsiyesi]`;
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) { throw new Error(`API Hatası: ${response.status}`); }

            const aiData = await response.json();
            const aiAnalysis = aiData.candidates[0].content.parts[0].text;

            await addDoc(collection(db, "tickets"), {
                userEmail: currentUser.email, 
                deviceType: deviceTypeInput.value, 
                deviceBrand: deviceBrandInput.value, 
                deviceModel: deviceModelInput.value, 
                description: issueDescInput.value,
                aiReport: aiAnalysis, 
                status: "Bekliyor", 
                interestedServices: [], 
                assignedService: "", 
                isForSale: isForSale, 
                offers: {}, 
                createdAt: serverTimestamp(),
                processStep: 0 
            });

            ticketForm.reset(); 
            if(deviceBrandInput) deviceBrandInput.disabled = true; 
            if(deviceModelInput) deviceModelInput.disabled = true;
            
            ticketMsg.innerHTML = `<span style="color: #10B981; font-weight: bold;">✅ Talebiniz kaydedildi (Başarıyla eklendi)!</span>`;
            setTimeout(() => ticketMsg.style.display = 'none', 4000);

        } catch (error) { 
            console.error("Hata vuku buldu:", error);
            ticketMsg.innerHTML = `<span style="color: #EF4444; font-weight: bold;">❌ Bir hata oluştu. API anahtarınızı ve internet bağlantınızı kontrol ediniz.</span>`; 
        }
    });
}

// --- GLOBAL İŞLEMLER ---
window.toggleSwipe = (event, element) => {
    if(event.target.tagName.toLowerCase() === 'button' || event.target.closest('button')) return; 
    document.querySelectorAll('.modern-ticket-card.swiped').forEach(el => { if(el !== element) el.classList.remove('swiped'); });
    element.classList.toggle('swiped');
};

window.deleteTicket = async (ticketId, event) => {
    if(event) event.stopPropagation();
    if(confirm("Bu kaydı silmek istediğinize emin misiniz?")) {
        try { await deleteDoc(doc(db, "tickets", ticketId)); } catch (error) { alert("Silinirken bir hata oluştu."); }
    }
};

window.selectService = async (ticketId, serviceEmail, event) => {
    if(event) event.stopPropagation();
    try {
        await updateDoc(doc(db, "tickets", ticketId), { assignedService: serviceEmail, status: "Servise Yönlendirildi", processStep: 0 });
        // Servise Bildirim Gönder
        await addDoc(collection(db, "notifications"), { userEmail: serviceEmail, message: "🎉 Bir müşteri tamir için sizi seçti!", link: `track.html?id=${ticketId}`, read: false, createdAt: serverTimestamp() });
        alert(serviceEmail + " servisini başarıyla seçtiniz!");
    } catch (error) { console.error("Hata:", error); }
};

window.acceptOffer = async (ticketId, serviceEmail, price, event) => {
    if(event) event.stopPropagation();
    if(confirm(`${price.toLocaleString('tr-TR')} TL teklifi kabul etmek istediğinize emin misiniz?`)) {
        try {
            await updateDoc(doc(db, "tickets", ticketId), { assignedService: serviceEmail, status: "Satıldı", acceptedPrice: price, processStep: 0 });
            // Servise Bildirim Gönder
            await addDoc(collection(db, "notifications"), { userEmail: serviceEmail, message: `₺ Müşteri cihazını size satmayı kabul etti! (${price.toLocaleString('tr-TR')} ₺)`, link: `track.html?id=${ticketId}`, read: false, createdAt: serverTimestamp() });
            alert("Teklifi kabul ettiniz! Süreç takibine başlayabilirsiniz.");
        } catch (error) { console.error("Hata:", error); }
    }
};

// --- MÜŞTERİ PANELİ YÖNETİMİ ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ROL GÜVENLİĞİ: Servis buraya giremez!
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if(userDoc.exists() && userDoc.data().role === "servis") {
            window.location.href = "service.html";
            return;
        }

        // BİLDİRİM SAYACI KONTROLÜ
        const notiQ = query(collection(db, "notifications"), where("userEmail", "==", user.email), where("read", "==", false));
        onSnapshot(notiQ, (snapshot) => {
            const badge = document.getElementById('noti-badge');
            if(badge) {
                if(snapshot.empty) { badge.style.display = 'none'; } 
                else { badge.style.display = 'flex'; badge.innerText = snapshot.size; }
            }
        });

        // NAVBAR KULLANICI MENÜSÜ OLUŞTURMA
        if(navAuthMenu) {
            const username = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
            
            navAuthMenu.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="profile-dropdown" id="profile-dropdown-container">
                        <span class="user-name-text" style="color: var(--text-main); font-weight: bold; font-size: 1rem;">👤 ${username}</span>
                        <button class="three-dots-btn" title="Menü">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>
                        
                        <div class="profile-dropdown-content">
                            <a href="dashboard.html">📊 Müşteri Paneli</a>
                            <a href="profile.html">👤 Profilim</a>
                            <a href="settings.html">🛠️ Ayarlar</a>
                        </div>
                    </div>
                    
                    <button id="home-logout-btn" class="logout-icon-btn" title="Sistemden Çıkış">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </button>
                </div>
            `;
            
            // Açılır Menü Dinleyicileri
            const dropdownContainer = document.getElementById('profile-dropdown-container');
            dropdownContainer.addEventListener('click', (e) => { e.stopPropagation(); dropdownContainer.classList.toggle('open'); });
            document.addEventListener('click', () => { if (dropdownContainer) dropdownContainer.classList.remove('open'); });

            // Çıkış Yapma
            document.getElementById('home-logout-btn').addEventListener('click', (e) => { 
                e.stopPropagation(); signOut(auth).then(() => { window.location.href = "login.html"; }); 
            });
        }

        // BİLETLERİ LİSTELE
        if(ticketList) {
            const q = query(collection(db, "tickets"), where("userEmail", "==", user.email));
            onSnapshot(q, (querySnapshot) => {
                ticketList.innerHTML = ''; 
                if(querySnapshot.empty) { ticketList.innerHTML = '<p style="color: var(--gray-light);">Henüz bir arıza kaydınız bulunmuyor.</p>'; return; }

                let myTickets = [];
                querySnapshot.forEach((doc) => { myTickets.push({ id: doc.id, ...doc.data() }); });
                myTickets.sort((a, b) => {
                    const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                    const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                    return dateB - dateA; 
                });

                myTickets.forEach((data) => {
                    const ticketId = data.id; 
                    const deviceInfo = data.deviceBrand ? `${data.deviceType} - ${data.deviceBrand} ${data.deviceModel}` : data.deviceType;
                    
                    let dateStr = "Şimdi eklendi";
                    if(data.createdAt) {
                        const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                        dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' });
                    }

                    let bidHtml = '';
                    if (data.isForSale) {
                        if (data.status === "Satıldı") {
                            bidHtml = `
                            <div class="success-box-dynamic" style="display:flex; flex-direction:column; gap:10px;">
                                <span><strong>₺ Cihazınız <span style="text-decoration: underline;">${data.assignedService}</span> servisine ${data.acceptedPrice.toLocaleString('tr-TR')} TL'ye satıldı!</strong></span>
                                <a href="track.html?id=${ticketId}" style="align-self:flex-start; padding:8px 20px; background: linear-gradient(135deg, #10B981, #059669); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">Süreci Takip Et 🚚</a>
                            </div>`;
                        } else {
                            bidHtml = `<div class="info-box-dynamic"><strong>₺ Servislerden Gelen Fiyat Teklifleri:</strong><br>`;
                            const offerKeys = data.offers ? Object.keys(data.offers) : [];
                            if (offerKeys.length > 0) {
                                offerKeys.forEach(srv => {
                                    let offerPrice = data.offers[srv];
                                    if (typeof offerPrice === 'object') offerPrice = offerPrice.price || 0; 

                                    bidHtml += `
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding:10px; background:rgba(0,0,0,0.1); border-radius:8px;">
                                        <span style="font-size:0.95rem;">${srv}: <strong style="font-size: 1.1rem; color: #10B981;">${Number(offerPrice).toLocaleString('tr-TR')} TL</strong></span>
                                        <button onclick="window.acceptOffer('${ticketId}', '${srv}', ${offerPrice}, event)" style="background:#10B981; border:none; padding:6px 15px; border-radius:6px; color:white; font-weight:bold; cursor:pointer;">Kabul Et</button>
                                    </div>`;
                                });
                            } else { bidHtml += `<span style="font-size:0.85rem;">⏳ Henüz fiyat teklifi gelmedi...</span>`; }
                            bidHtml += `</div>`;
                        }
                    } else {
                        if (data.assignedService) { 
                            bidHtml = `
                            <div class="success-box-dynamic" style="display:flex; flex-direction:column; gap:10px;">
                                <span><strong>✅ Cihazınız <span style="text-decoration: underline;">${data.assignedService}</span> isimli servise yönlendirildi.</strong></span>
                                <a href="track.html?id=${ticketId}" style="align-self:flex-start; padding:8px 20px; background: linear-gradient(135deg, var(--primary), #4338ca); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);">Süreci Takip Et 🚚</a>
                            </div>`; 
                        } 
                        else if (data.interestedServices && data.interestedServices.length > 0) {
                            bidHtml = `<div class="info-box-dynamic"><strong>🎉 Bu cihazı tamir edebilecek servisler:</strong><br>`;
                            data.interestedServices.forEach(srv => { 
                                bidHtml += `<button onclick="window.selectService('${ticketId}', '${srv}', event)" style="margin-top:8px; background: #10B981; padding: 5px 10px; width: auto; font-size: 0.85rem; display: block; border:none; border-radius: 6px; color:white; font-weight:bold; cursor:pointer;">${srv} - Bu Servisi Seç</button>`; 
                            });
                            bidHtml += `</div>`;
                        }
                    }

                    const statusClass = data.status === 'Bekliyor' ? 'status-bekliyor' : 'status-onaylandi';
                    const ticketWrapper = document.createElement('div');
                    ticketWrapper.className = 'ticket-wrapper';

                    ticketWrapper.innerHTML = `
                        <div class="delete-action-btn" onclick="window.deleteTicket('${ticketId}', event)" title="Kaydı Sil"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></div>
                        <div class="modern-ticket-card" onclick="window.toggleSwipe(event, this)">
                            <div class="modern-ticket-header">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 1.8rem; background: rgba(79, 70, 229, 0.1); border-radius: 12px; padding: 5px;">📱</span>
                                    <div>
                                        <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">${deviceInfo}</h4>
                                        <span style="font-size: 0.8rem; color: #94A3B8;">📅 ${dateStr} | Kayıt ID: #${ticketId.slice(0,6).toUpperCase()}</span>
                                    </div>
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
        window.location.href = "login.html";
    }
});