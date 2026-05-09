// js/app.js
import { db, auth } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { deviceData } from './deviceData.js';
import { icons } from './icons.js';

const keyPart1 = "gsk_FrBvhp1olAlq5nrdZ1IqWGdyb";
const keyPart2 = "3FYPc8T04HcYnTBDJWMbjkTbFMF";
const GROQ_API_KEY = keyPart1 + keyPart2;

const ticketForm = document.getElementById('ticket-form');
const deviceTypeInput = document.getElementById('device-type');
const deviceBrandInput = document.getElementById('device-brand');
const deviceModelInput = document.getElementById('device-model');
const issueDescInput = document.getElementById('issue-desc');
const ticketMsg = document.getElementById('ticket-msg');
const ticketList = document.getElementById('ticket-list');
const navAuthMenu = document.getElementById('nav-auth-menu');

// --- 1. MENÜ ÇİZİM FONKSİYONU (Hem Cache Hem Firebase kullanır) ---
const renderAuthMenu = (username) => {
    if (!navAuthMenu) return;

    navAuthMenu.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div class="profile-dropdown" id="profile-dropdown-container">
                <span class="user-name-text" style="color: var(--text-main); font-weight: bold; font-size: 1rem; display:inline-flex; align-items:center; gap:5px;">${icons.user} ${username}</span>
                <button class="three-dots-btn" title="Menü">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </button>
                
                <div class="profile-dropdown-content">
                    <a href="../index.html">Ana Sayfa</a>
                    <a href="dashboard.html">Yeni Kayıt Oluştur</a>
                    <a href="tickets.html">Geçmiş Kayıtlarım</a>
                    <a href="profile.html">Profilim</a>
                    <a href="settings.html">Ayarlar</a>
                    <a href="chats.html">Mesajlarım</a>
                </div>
            </div>
            
            <button id="home-logout-btn" class="logout-icon-btn" title="Sistemden Çıkış">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
        </div>
    `;

    // Dropdown olayları
    const dropdownContainer = document.getElementById('profile-dropdown-container');
    if (dropdownContainer) dropdownContainer.addEventListener('click', (e) => { e.stopPropagation(); dropdownContainer.classList.toggle('open'); });
    document.addEventListener('click', () => { if (dropdownContainer) dropdownContainer.classList.remove('open'); });

    // Çıkış Yapma
    const logoutBtn = document.getElementById('home-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            localStorage.removeItem('tz_customer_cache');
            localStorage.removeItem('tz_customer_tickets_cache');
            signOut(auth).then(() => { window.location.href = "login.html"; });
        });
    }
};

// --- 2. HIZLI YÜKLEME (CACHE) TETİKLEYİCİSİ ---
// Sayfa açılır açılmaz hafızadaki kullanıcı adını alıp menüyü çizer
const cachedUser = JSON.parse(localStorage.getItem('tz_customer_cache'));
if (cachedUser && cachedUser.username) {
    renderAuthMenu(cachedUser.username);
}

// --- KATEGORİ SİSTEMİ ---
const initCategories = () => {
    if (!deviceTypeInput) return;
    deviceTypeInput.innerHTML = '<option value="">Cihaz Kategorisi Seçin</option>';
    Object.keys(deviceData).forEach(category => deviceTypeInput.appendChild(new Option(category, category)));
};
initCategories();

if (deviceTypeInput) {
    deviceTypeInput.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        deviceBrandInput.innerHTML = '<option value="">Marka Seçin</option>';
        deviceModelInput.innerHTML = '<option value="">Model Seçin</option>';
        deviceModelInput.disabled = true;
        if (selectedType && deviceData[selectedType]) {
            Object.keys(deviceData[selectedType]).forEach(brand => deviceBrandInput.appendChild(new Option(brand, brand)));
            deviceBrandInput.disabled = false;
        } else deviceBrandInput.disabled = true;
    });

    deviceBrandInput.addEventListener('change', (e) => {
        const selectedType = deviceTypeInput.value;
        const selectedBrand = e.target.value;
        deviceModelInput.innerHTML = '<option value="">Model Seçin</option>';
        if (selectedBrand && deviceData[selectedType] && deviceData[selectedType][selectedBrand]) {
            deviceData[selectedType][selectedBrand].forEach(model => deviceModelInput.appendChild(new Option(model, model)));
            deviceModelInput.disabled = false;
        } else deviceModelInput.disabled = true;
    });
}

function formatAIReport(aiText) {
    if (!aiText) return '';
    let cleanText = aiText.replace(/\*/g, '');
    let ariza = "Bilinmiyor", zorluk = 5, sure = "—", aciliyet = "Orta", cozum = "Belirtilmedi";
    cleanText.split('\n').forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('ariza:') || lower.includes('arıza:')) ariza = line.split(':').slice(1).join(':').trim();
        if (lower.includes('zorluk:')) zorluk = parseInt(line.split(':').slice(1).join(':').trim().replace(/\D/g, '')) || 5;
        if (lower.includes('sure:') || lower.includes('süre:')) sure = line.split(':').slice(1).join(':').trim();
        if (lower.includes('aciliyet:')) aciliyet = line.split(':').slice(1).join(':').trim();
        if (lower.includes('cozum:') || lower.includes('çözüm:')) cozum = line.split(':').slice(1).join(':').trim();
    });

    const diffColor = zorluk <= 3 ? '#10B981' : zorluk <= 6 ? '#F59E0B' : '#EF4444';
    const diffLabel = zorluk <= 3 ? 'Kolay' : zorluk <= 6 ? 'Orta' : 'Zor';
    const diffBg = zorluk <= 3 ? 'rgba(16,185,129,0.12)' : zorluk <= 6 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
    const aciColor = aciliyet.toLowerCase().includes('yüksek') || aciliyet.toLowerCase().includes('yuksek') ? '#EF4444'
        : aciliyet.toLowerCase().includes('orta') ? '#F59E0B' : '#10B981';
    const diffPct = zorluk * 10;

    return `
        <div class="ai-diag-card">
            <div class="ai-diag-header">
                <div class="ai-diag-icon-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2zM9 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
                </div>
                <span class="ai-diag-title">Yapay Zeka Ön Teşhis Raporu</span>
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

            <div class="ai-diag-solution">
                <div class="ai-diag-sol-label">Çözüm Önerisi</div>
                <div class="ai-diag-sol-text">${cozum}</div>
            </div>
        </div>
    `;
}

// --- YENİ KAYIT ---
if (ticketForm) {
    ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentUser = auth.currentUser;
        if (!currentUser) return alert("Sisteme dahil olmanız icap eder! (Giriş yapmalısınız)");

        const isForSale = document.getElementById('is-for-sale')?.checked || false;
        const skipAi = document.getElementById('skip-ai')?.checked || false;

        ticketMsg.style.display = 'block';
        if (skipAi) ticketMsg.innerHTML = `<div style="color: var(--primary); font-weight: 600; font-size: 0.95rem; display:flex; align-items:center; gap:5px;">${icons.rocket} Hızlı kayıt oluşturuluyor, lütfen bekleyiniz...</div>`;
        else ticketMsg.innerHTML = `<div style="color: var(--primary); font-weight: 600; font-size: 0.95rem; display:flex; align-items:center; gap:5px;">${icons.bot} AI analiz ediyor, lütfen bekleyiniz...</div><div class="loading-bar-container"><div class="loading-bar"></div></div>`;

        try {
            let aiAnalysis = "";
            if (!skipAi) {
                let prompt = isForSale
                    ? `Sen bir ikinci el cihaz eksperisin. Cihaz: ${deviceTypeInput.value} - ${deviceBrandInput.value} ${deviceModelInput.value}. Arızası: "${issueDescInput.value}". SADECE su formatta yanit ver (baska hicbir sey yazma):\nAriza: [ariza adi]\nZorluk: [1-10]\nSure: [tahmini sure, orn: 30-60 dk]\nAciliyet: [Dusuk / Orta / Yuksek]\nCozum: [kisa satis tavsiyesi]`
                    : `Sen uzman bir teknik servissin. Sikayet: "${issueDescInput.value}". Cihaz: ${deviceTypeInput.value} - ${deviceBrandInput.value} ${deviceModelInput.value}. SADECE su formatta yanit ver (baska hicbir sey yazma):\nAriza: [kisa ariza tahmini]\nZorluk: [1-10]\nSure: [tahmini onarim suresi, orn: 2-3 saat]\nAciliyet: [Dusuk / Orta / Yuksek]\nCozum: [tek cumle tavsiye]`;

                const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
                    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
                    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], max_tokens: 150, temperature: 0.2 })
                });

                if (!response.ok) throw new Error("Bilinmeyen API Hatası");
                aiAnalysis = (await response.json()).choices[0].message.content;
            } else {
                aiAnalysis = "Arıza kaydı, 'Hızlı Gönder' seçeneği kullanıldığı için yapay zekâ analizi yapılmadan doğrudan servise iletilmiştir.";
            }

            await addDoc(collection(db, "tickets"), {
                userEmail: currentUser.email, deviceType: deviceTypeInput.value, deviceBrand: deviceBrandInput.value, deviceModel: deviceModelInput.value, description: issueDescInput.value,
                aiReport: aiAnalysis, status: "Bekliyor", interestedServices: [], assignedService: "", isForSale: isForSale, offers: {}, createdAt: serverTimestamp(), processStep: 0
            });

            ticketForm.reset();
            if (deviceBrandInput) deviceBrandInput.disabled = true;
            if (deviceModelInput) deviceModelInput.disabled = true;
            ticketMsg.innerHTML = `<span style="color: #10B981; font-weight: bold; display:flex; align-items:center; gap:5px;">${icons.check} Talebiniz başarıyla oluşturuldu ve servislere iletildi!</span>`;
            setTimeout(() => ticketMsg.style.display = 'none', 4000);

        } catch (error) {
            console.error("İşlem Hatası:", error);
            ticketMsg.innerHTML = `<span style="color: #EF4444; font-weight: bold; display:flex; align-items:center; gap:5px;">${icons.cross} Hata oluştu. Lütfen "⚡ Hızlı Gönder"i seçin.</span>`;
        }
    });
}

const generateCargoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TZ-';
    for (let i = 0; i < 7; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
};

async function sendEmailNotification(toEmail, subject, message) {
    try {
        const q = query(collection(db, "users"), where("email", "==", toEmail));
        const querySnapshot = await getDocs(q);
        let wantsEmail = true;
        if (!querySnapshot.empty && querySnapshot.docs[0].data().notifEmail === false) wantsEmail = false;

        if (wantsEmail) await emailjs.send("service_u85t58o", "template_0a4enu5", { to_email: toEmail, subject: subject, message: message }, "_P1jn1r_0u2nA33Q3");
    } catch (err) { console.error("Mail hatası:", err); }
}


// --- FİREBASE AUTH VE VERİ YÜKLEME ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Gerçek kullanıcı adını Firebase'den al
        const username = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];

        // Rol Kontrolü
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "servis") {
            window.location.href = "service.html";
            return;
        }

        // Cache'i gerçek isimle güncelle ve menüyü yeniden çiz
        localStorage.setItem('tz_customer_cache', JSON.stringify({ username }));
        renderAuthMenu(username);

        // Bildirim Kontrolü
        const notiQ = query(collection(db, "notifications"), where("userEmail", "==", user.email), where("read", "==", false));
        onSnapshot(notiQ, (snapshot) => {
            const badge = document.getElementById('noti-badge');
            if (badge) { if (snapshot.empty) badge.style.display = 'none'; else { badge.style.display = 'flex'; badge.innerText = snapshot.size; } }
        });


    } else {
        localStorage.removeItem('tz_customer_cache');
        localStorage.removeItem('tz_customer_tickets_cache');
        window.location.href = "login.html";
    }
});