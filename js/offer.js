// js/offer.js
// Fiyat Pazarlık Sayfası — Satış ve Tamir Teklifleri İçin
import { db, auth } from './firebase-config.js';
import {
    collection, query, where, onSnapshot,
    addDoc, updateDoc, getDoc, getDocs,
    doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// --- URL PARAMETRELER ---
const params = new URLSearchParams(window.location.search);
const ticketId   = params.get('ticketId');
const targetSrv  = params.get('serviceEmail');   // Hangi servisle pazarlık yapılıyor
const offerType  = params.get('type') || 'sale'; // 'sale' | 'repair'

if (!ticketId || !targetSrv) {
    alert("Geçersiz bağlantı.");
    history.back();
}

// --- UI ELEMENTLER ---
const deviceCard       = document.getElementById('offer-device-card');
const currentStatusEl  = document.getElementById('offer-current-status');
const historyEl        = document.getElementById('offer-history');
const sendFormEl       = document.getElementById('offer-send-form');
const serviceWaitEl    = document.getElementById('offer-service-waiting');
const pageTitle        = document.getElementById('offer-page-title');
const pageSubtitle     = document.getElementById('offer-page-subtitle');
const newPriceInput    = document.getElementById('new-offer-price');
const newNoteInput     = document.getElementById('new-offer-note');
const sendOfferBtn     = document.getElementById('send-offer-btn');

let currentUser       = null;
let ticketData        = null;
let isCustomer        = false;
let isService         = false;
let serviceOfferPrice = 0;  // Servisin orijinal teklif fiyatı (validasyon için)

// --- EMAIL ---
async function sendEmailNotification(toEmail, subject, message) {
    try {
        const q = query(collection(db, "users"), where("email", "==", toEmail));
        const snap = await getDocs(q);
        let wantsEmail = true;
        if (!snap.empty && snap.docs[0].data().notifEmail === false) wantsEmail = false;
        if (wantsEmail && typeof emailjs !== 'undefined') {
            await emailjs.send("service_u85t58o", "template_0a4enu5",
                { to_email: toEmail, subject, message }, "_P1jn1r_0u2nA33Q3");
        }
    } catch (err) { console.error("Mail hatası:", err); }
}

// --- KARGO KODU ---
function generateCargoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TZ-';
    for (let i = 0; i < 7; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

// --- AUTH ---
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "login.html"; return; }
    currentUser = user;

    // Ticket bilgisini çek
    const ticketSnap = await getDoc(doc(db, "tickets", ticketId));
    if (!ticketSnap.exists()) { alert("Kayıt bulunamadı."); history.back(); return; }
    ticketData = { id: ticketSnap.id, ...ticketSnap.data() };

    isCustomer = currentUser.email === ticketData.userEmail;
    isService  = currentUser.email === targetSrv;

    if (!isCustomer && !isService) {
        alert("Bu sayfaya erişim yetkiniz yok.");
        history.back();
        return;
    }

    renderDeviceCard();
    setupUI();
    listenToNegotiations();
});

// --- CİHAZ KARTI ---
function renderDeviceCard() {
    const t = ticketData;
    const deviceName = t.deviceBrand ? `${t.deviceType} — ${t.deviceBrand} ${t.deviceModel}` : t.deviceType;
    const badgeClass = offerType === 'sale' ? 'offer-type-sale' : 'offer-type-repair';
    const badgeLabel = offerType === 'sale' ? '💰 Satış Pazarlığı' : '🔧 Tamir Pazarlığı';
    const partnerLabel = isCustomer
        ? `Servis: ${targetSrv.split('@')[0]}`
        : `Müşteri: ${t.userEmail.split('@')[0]}`;

    deviceCard.innerHTML = `
        <div class="offer-device-icon">📱</div>
        <div class="offer-device-info">
            <div class="offer-device-name">${deviceName}</div>
            <div class="offer-device-meta">
                <span class="offer-type-badge ${badgeClass}">${badgeLabel}</span>
                <span>${partnerLabel}</span>
            </div>
        </div>
    `;

    if (pageTitle)    pageTitle.innerText = offerType === 'sale' ? 'Satış Pazarlığı' : 'Tamir Pazarlığı';
    if (pageSubtitle) pageSubtitle.innerText = deviceName;
}

// --- UI KURULUMU ---
function setupUI() {
    // Servisin orijinal teklif fiyatını al
    if (offerType === 'sale') {
        const offerRaw = ticketData.offers ? ticketData.offers[targetSrv] : null;
        serviceOfferPrice = typeof offerRaw === 'object' ? (offerRaw?.price || 0) : (Number(offerRaw) || 0);
    } else {
        const ro = ticketData.repairOffers ? ticketData.repairOffers[targetSrv] : null;
        serviceOfferPrice = ro ? Number(ro.price) : 0;
    }

    // Müşteri tarafı: teklif gönderme formu
    if (isCustomer && sendFormEl) {
        // Tamamlanmışsa form gösterme
        if (ticketData.processCompleted || ticketData.status === 'Satıldı' || ticketData.assignedService) {
            sendFormEl.style.display = 'none';
        } else {
            sendFormEl.style.display = 'flex';

            // Fiyat aralığını forma yaz
            if (serviceOfferPrice > 0) {
                let minAllowed, maxAllowed, hintExtra, placeholder;

                if (offerType === 'sale') {
                    // Satılık: Müşteri daha yüksek fiyat ister (servis satın alıyor, müşteri fiyatı artırır)
                    minAllowed = serviceOfferPrice;                       // En az servis fiyatı
                    maxAllowed = Math.floor(serviceOfferPrice * 1.6);     // En fazla %60 fazlası
                    hintExtra  = '(servis fiyatının %100’u — %160’ı)';
                    placeholder = `${minAllowed.toLocaleString('tr-TR')} — ${maxAllowed.toLocaleString('tr-TR')} ₺`;
                } else {
                    // Tamir: Müşteri daha az ödemek ister (pazarlık aşağı yönlü)
                    minAllowed = Math.ceil(serviceOfferPrice * 0.4);      // En az %40
                    maxAllowed = serviceOfferPrice;                       // En fazla servis fiyatı
                    hintExtra  = '(servis fiyatının %40’ı — %100’ü)';
                    placeholder = `${minAllowed.toLocaleString('tr-TR')} — ${maxAllowed.toLocaleString('tr-TR')} ₺`;
                }

                const hintEl = document.querySelector('.offer-send-hint');
                if (hintEl) {
                    hintEl.innerHTML = `
                        Teklifiniz servise iletilecek; servis kabul ederse işlem onaylanır ve kargo kodunuz oluşturulur.<br>
                        <strong style="color:var(--primary);">Geçerli aralık: ${minAllowed.toLocaleString('tr-TR')} ₺ — ${maxAllowed.toLocaleString('tr-TR')} ₺</strong>
                        <span style="color:var(--gray-light); font-size:0.75rem;"> ${hintExtra}</span>
                    `;
                }
                if (newPriceInput) {
                    newPriceInput.min = minAllowed;
                    newPriceInput.max = maxAllowed;
                    newPriceInput.placeholder = placeholder;
                }
            }
        }
    }

    // Servis tarafı: bekleme mesajı — başlangıçta GİZLİ, yalnızca boş negotiate listesinde gösterilir
    if (isService && serviceWaitEl) {
        serviceWaitEl.style.display = 'none'; // renderHistory içinde kontrol edilecek
    }
}

// --- PAZARLIKLARı DİNLE (Realtime) ---
function listenToNegotiations() {
    // Yalnızca ticketId ile sorgula (tek koşul = index/güvenlik sorunu yok)
    // serviceEmail filtresi client-side yapılıyor — hem müşteri hem servis çalışır
    const q = query(
        collection(db, "negotiations"),
        where("ticketId", "==", ticketId)
    );

    onSnapshot(q, (snapshot) => {
        const docs = [];
        snapshot.forEach(d => {
            const neg = d.data();
            // Hem targetSrv hem de aktif kullanıcı email'iyle eşleştir
            // (URL encoding farkı veya ufak uyumsuzluklar için güvence)
            const matchesSrv = neg.serviceEmail === targetSrv;
            const matchesUser = isService && neg.serviceEmail === currentUser?.email;
            if (matchesSrv || matchesUser) {
                docs.push(d);
            }
        });
        // createdAt'a göre artan sıralama
        docs.sort((a, b) => {
            const aMs = a.data().createdAt?.toMillis?.() || 0;
            const bMs = b.data().createdAt?.toMillis?.() || 0;
            return aMs - bMs;
        });
        renderHistory(docs);
        updateCurrentStatus(docs);
    }, (err) => {
        console.error("⚠️ Pazarlık sorgu hatası:", err);
        if (historyEl) historyEl.innerHTML = '<div class="offer-history-empty">⚠️ Pazarlık geçmişi yüklenemedi. Lütfen sayfayı yenileyin.</div>';
    });
}

// --- GEÇMİŞ RENDER ---
function renderHistory(docs) {
    if (!historyEl) return;

    if (docs.length === 0) {
        historyEl.innerHTML = '<div class="offer-history-empty">Henüz bir teklif gönderilmedi.</div>';
        // Servis tarafındaysa bekleme mesajını göster
        if (isService && serviceWaitEl) serviceWaitEl.style.display = 'flex';
        return;
    }

    let html = '';
    const lastDoc = docs[docs.length - 1];

    docs.forEach(d => {
        const neg = d.data();
        const isLastRecord = d.id === lastDoc.id;
        const fromCustomer = neg.proposedBy === 'customer';
        const fromClass = fromCustomer ? 'from-customer' : 'from-service';

        let timeStr = '';
        if (neg.createdAt) {
            const dt = neg.createdAt.toDate();
            timeStr = dt.toLocaleString('tr-TR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
        }

        const statusBadge = {
            pending:  '<span class="offer-record-status offer-status-pending">⏳ Bekliyor</span>',
            accepted: '<span class="offer-record-status offer-status-accepted">✅ Kabul Edildi</span>',
            rejected: '<span class="offer-record-status offer-status-rejected">❌ Reddedildi</span>',
        }[neg.status || 'pending'];

        const whoLabel = fromCustomer ? 'Müşteri Teklifi' : 'Servis Teklifi';
        const partLabel = neg.part ? `<div class="offer-record-part">🔧 Parça: ${neg.part}</div>` : '';
        const noteHtml  = neg.note ? `<div class="offer-record-note">${neg.note}</div>` : '';

        // Servis tarafı için Kabul/Reddet butonları — sadece son pending kayıtta, karşı tarafın teklifi ise
        let actionBtns = '';
        if (isService && isLastRecord && neg.status === 'pending' && neg.proposedBy === 'customer') {
            actionBtns = `
                <div class="offer-action-btns">
                    <button class="offer-reject-btn" onclick="window.respondOffer('${d.id}', 'rejected')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        Reddet
                    </button>
                    <button class="offer-accept-btn" onclick="window.respondOffer('${d.id}', 'accepted', ${neg.price})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Kabul Et
                    </button>
                </div>
            `;
        }

        // Müşteri tarafı için — servisin karşı teklifi pending ise kabul/reddet göster
        if (isCustomer && isLastRecord && neg.status === 'pending' && neg.proposedBy === 'service') {
            actionBtns = `
                <div class="offer-action-btns">
                    <button class="offer-reject-btn" onclick="window.customerRespondOffer('${d.id}', 'rejected', ${neg.price})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        Reddet
                    </button>
                    <button class="offer-accept-btn" onclick="window.customerRespondOffer('${d.id}', 'accepted', ${neg.price})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Kabul Et
                    </button>
                </div>
            `;
        }

        html += `
            <div class="offer-record ${fromClass}">
                <div class="offer-record-bubble">
                    <div class="offer-record-who">${whoLabel}</div>
                    <div class="offer-record-price">${Number(neg.price).toLocaleString('tr-TR')} ₺</div>
                    ${partLabel}
                    ${noteHtml}
                    <div class="offer-record-time">${timeStr}</div>
                </div>
                ${statusBadge}
                ${actionBtns}
            </div>
        `;
    });

    // Servis karşı teklif formu: son kayıt reddedilmiş müşteri teklifi ise göster
    const lastNegData = lastDoc.data();
    const canServiceCounterOffer = isService
        && lastNegData.status === 'rejected'
        && lastNegData.proposedBy === 'customer';

    if (canServiceCounterOffer) {
        // Fiyat sınırlarını hesapla
        const customerLastPrice = lastNegData.price; // Müşterinin reddedilen son teklifi
        let srvOriginalPrice = 0;
        if (offerType === 'sale') {
            const offerRaw = ticketData.offers?.[targetSrv];
            srvOriginalPrice = typeof offerRaw === 'object' ? (offerRaw?.price || 0) : (Number(offerRaw) || 0);
        } else {
            srvOriginalPrice = ticketData.repairOffers?.[targetSrv]?.price || 0;
        }

        // Tamir: müşteri teklifi ≤ karşı teklif ≤ servis orijinal fiyatı
        // Satış: servis orijinal fiyatı ≤ karşı teklif ≤ müşteri teklifi
        const minAllowed = offerType === 'repair' ? customerLastPrice : srvOriginalPrice;
        const maxAllowed = offerType === 'repair' ? srvOriginalPrice   : customerLastPrice;
        const rangeHint  = offerType === 'repair'
            ? `Müşteri teklifi (${customerLastPrice.toLocaleString('tr-TR')} ₺) ile orijinal fiyatınız (${srvOriginalPrice.toLocaleString('tr-TR')} ₺) arasında olmalı.`
            : `Orijinal teklifiniz (${srvOriginalPrice.toLocaleString('tr-TR')} ₺) ile müşteri teklifi (${customerLastPrice.toLocaleString('tr-TR')} ₺) arasında olmalı.`;

        html += `
            <div id="service-counter-form" data-min="${minAllowed}" data-max="${maxAllowed}"
                style="margin-top:16px; background:rgba(79,70,229,0.06); border:1px dashed var(--primary); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:10px;">
                <div style="font-weight:700; color:var(--text-main); font-size:0.95rem; display:flex; align-items:center; gap:6px;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Yeni Karşı Teklifinizi Gönderin
                </div>
                <p style="margin:0; font-size:0.8rem; color:var(--gray-light); display:flex; align-items:center; gap:5px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    ${rangeHint}
                </p>
                <div style="display:flex; align-items:center; gap:8px; background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; padding:8px 12px;">
                    <span style="font-weight:800; color:var(--primary); font-size:1.2rem;">&#8378;</span>
                    <input type="number" id="service-counter-price"
                        placeholder="${minAllowed.toLocaleString('tr-TR')} — ${maxAllowed.toLocaleString('tr-TR')} ₺"
                        min="${minAllowed}" max="${maxAllowed}"
                        style="flex:1; border:none; background:transparent; color:var(--text-main); outline:none; font-size:1rem;" />
                </div>
                <textarea id="service-counter-note" placeholder="Bir not ekleyin... (İsteğe bağlı)" rows="2"
                    style="resize:none; border:1px solid var(--border-color); border-radius:8px; padding:10px; background:var(--card-bg); color:var(--text-main); outline:none; font-size:0.9rem;"></textarea>
                <button onclick="window.serviceCounterOffer()" style="background:linear-gradient(135deg, var(--primary), #4338ca); color:white; border:none; border-radius:8px; padding:10px 20px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Karşı Teklif Gönder
                </button>
            </div>
        `;
    }

    historyEl.innerHTML = html;

    // Servis bekleme mesajını gizle (kayıt varsa)
    if (serviceWaitEl) serviceWaitEl.style.display = 'none';
}

// --- GÜNCEL DURUM BANNER ---
function updateCurrentStatus(docs) {
    if (!currentStatusEl) return;
    if (docs.length === 0) { currentStatusEl.style.display = 'none'; return; }

    // Son kaydı bul (client-side sıralı dizinin son elemanı)
    const lastNeg = docs[docs.length - 1].data();

    // Orijinal servis teklifini göster (tickets.offers veya repairOffers'tan)
    let originalPrice = 0, originalPart = '';
    if (offerType === 'sale') {
        const offerRaw = ticketData.offers ? ticketData.offers[targetSrv] : null;
        originalPrice = typeof offerRaw === 'object' ? (offerRaw?.price || 0) : (offerRaw || 0);
    } else {
        const ro = ticketData.repairOffers ? ticketData.repairOffers[targetSrv] : null;
        originalPrice = ro ? ro.price : 0;
        originalPart  = ro ? ro.part  : '';
    }

    const priceColor = lastNeg.status === 'accepted' ? '#10B981' : 'var(--primary)';
    const partHtml = originalPart ? `<div class="offer-status-part">🔧 ${originalPart}</div>` : '';

    currentStatusEl.style.display = 'block';
    currentStatusEl.innerHTML = `
        <div class="offer-status-row">
            <div>
                <div class="offer-status-label">Servisin Teklif Ettiği Fiyat</div>
                <div class="offer-status-price" style="color:${priceColor};">${Number(originalPrice).toLocaleString('tr-TR')} ₺</div>
                ${partHtml}
            </div>
            ${lastNeg.status === 'accepted' ? `
                <div style="background:rgba(16,185,129,0.1); border:1px solid #10B98140; border-radius:10px; padding:8px 14px; text-align:center;">
                    <div style="font-size:0.8rem; color:#10B981; font-weight:700;">✅ Anlaşma Sağlandı</div>
                    <div style="font-size:1.1rem; font-weight:800; color:#10B981;">${Number(lastNeg.price).toLocaleString('tr-TR')} ₺</div>
                </div>
            ` : ''}
        </div>
    `;
}

// --- TEKLİF GÖNDER (Müşteri) ---
if (sendOfferBtn) {
    sendOfferBtn.addEventListener('click', async () => {
        const price = parseInt(newPriceInput?.value, 10);

        // Fiyat aralığı doğrulama
        if (isNaN(price) || price < 10) {
            alert("Lütfen geçerli bir fiyat giriniz.");
            return;
        }
        if (serviceOfferPrice > 0) {
            let minAllowed, maxAllowed;
            if (offerType === 'sale') {
                // Satılık: müşteri fiyatı EN AZ servis fiyatı kadar olmalı, en fazla %60 fazlası
                minAllowed = serviceOfferPrice;
                maxAllowed = Math.floor(serviceOfferPrice * 1.6);
                if (price < minAllowed) {
                    alert(`❌ Satılık cihazda önerdiğiniz fiyat, servisin teklif ettiği fiyattan (${minAllowed.toLocaleString('tr-TR')} ₺) az olamaz. Daha yüksek bir fiyat önerin.`);
                    newPriceInput.value = minAllowed;
                    newPriceInput.focus();
                    return;
                }
                if (price > maxAllowed) {
                    alert(`❌ Önerdiğiniz fiyat, servis teklifinin %160'ının (${maxAllowed.toLocaleString('tr-TR')} ₺) üstüne çıkamaz.`);
                    newPriceInput.value = maxAllowed;
                    newPriceInput.focus();
                    return;
                }
            } else {
                // Tamir: müşteri daha az ödemek ister — servis fiyatının altında ama %40'ının üstünde
                minAllowed = Math.ceil(serviceOfferPrice * 0.4);
                maxAllowed = serviceOfferPrice;
                if (price > maxAllowed) {
                    alert(`❌ Tamir talebinde önerdiğiniz fiyat servisin teklif ettiği fiyatı (${maxAllowed.toLocaleString('tr-TR')} ₺) geçemez.`);
                    newPriceInput.value = maxAllowed;
                    newPriceInput.focus();
                    return;
                }
                if (price < minAllowed) {
                    alert(`❌ Önerdiğiniz fiyat, servis teklifinin %40'ının (${minAllowed.toLocaleString('tr-TR')} ₺) altına inemez.`);
                    newPriceInput.value = minAllowed;
                    newPriceInput.focus();
                    return;
                }
            }
        }

        const note = newNoteInput?.value.trim() || '';

        sendOfferBtn.disabled = true;
        sendOfferBtn.textContent = 'Gönderiliyor...';

        try {
            await addDoc(collection(db, "negotiations"), {
                ticketId,
                serviceEmail: targetSrv,
                customerEmail: ticketData.userEmail,
                proposedBy: 'customer',
                price,
                part: '',
                note,
                type: offerType,
                status: 'pending',
                createdAt: serverTimestamp()
            });

            // Bildirim
            await addDoc(collection(db, "notifications"), {
                userEmail: targetSrv,
                message: `💰 Müşteri yeni bir fiyat teklifi gönderdi: ${price.toLocaleString('tr-TR')} ₺`,
                link: `offer.html?ticketId=${ticketId}&serviceEmail=${encodeURIComponent(targetSrv)}&type=${offerType}`,
                read: false,
                createdAt: serverTimestamp()
            });

            if (newPriceInput) newPriceInput.value = '';
            if (newNoteInput)  newNoteInput.value = '';
            alert("Teklifiniz servise iletildi!");
        } catch (e) {
            console.error(e);
            alert("Teklif gönderilemedi.");
        } finally {
            sendOfferBtn.disabled = false;
            sendOfferBtn.textContent = 'Teklif Gönder';
        }
    });
}

// --- KABUL / REDDET (Servis) ---
window.respondOffer = async (negId, response, price) => {
    const confirmMsg = response === 'accepted'
        ? `${Number(price).toLocaleString('tr-TR')} ₺ teklifini KABUL etmek istiyor musunuz? İşlem onaylanacak.`
        : 'Bu teklifi REDDETMEK istiyor musunuz? Müşteriye bildirim gönderilecek.';

    if (!confirm(confirmMsg)) return;

    // Butonları geçici olarak devre dışı bırak
    document.querySelectorAll('.offer-accept-btn, .offer-reject-btn').forEach(b => b.disabled = true);

    try {
        // Negotiation durumunu güncelle
        await updateDoc(doc(db, "negotiations", negId), { status: response });

        if (response === 'accepted') {
            // Ticket'ı güncelle
            if (offerType === 'sale') {
                const cargoCode = generateCargoCode();
                await updateDoc(doc(db, "tickets", ticketId), {
                    assignedService: targetSrv,
                    status: "Satıldı",
                    acceptedPrice: price,
                    processStep: 0,
                    cargoCode,
                    cancellationRequested: false
                });

                // Müşteriyi bilgilendir
                await addDoc(collection(db, "notifications"), {
                    userEmail: ticketData.userEmail,
                    message: `🎉 ${Number(price).toLocaleString('tr-TR')} ₺ teklifiniz kabul edildi! Kargo kodunuz: ${cargoCode}`,
                    link: `tickets.html`,
                    read: false,
                    createdAt: serverTimestamp()
                });

                sendEmailNotification(
                    ticketData.userEmail,
                    "TeknikZeka: Fiyat Teklifiniz Kabul Edildi!",
                    `Tebrikler! ${targetSrv} servisi ${Number(price).toLocaleString('tr-TR')} ₺ teklifinizi kabul etti.\n\nAnlaşmalı Kargo Kodunuz: ${cargoCode}\n\nLütfen cihazınızı güzelce paketleyip kargo şubesine bu kod ile teslim ediniz.`
                );
                sendEmailNotification(
                    targetSrv,
                    "TeknikZeka: Teklifi Onayladınız",
                    `${Number(price).toLocaleString('tr-TR')} ₺ karşılığında müşterinin cihazını satın aldınız. Müşteri kargo ile gönderecek.`
                );

            } else {
                // Tamir: repairOffer fiyatını güncelle ve servis seç
                const cargoCode = generateCargoCode();
                const existingOffer = ticketData.repairOffers?.[targetSrv] || {};
                let repairOffers = { ...(ticketData.repairOffers || {}) };
                repairOffers[targetSrv] = { ...existingOffer, price };

                await updateDoc(doc(db, "tickets", ticketId), {
                    assignedService: targetSrv,
                    status: "Servise Yönlendirildi",
                    processStep: 0,
                    cargoCode,
                    repairOffers,
                    cancellationRequested: false
                });

                await addDoc(collection(db, "notifications"), {
                    userEmail: ticketData.userEmail,
                    message: `🔧 Tamir teklifi ${Number(price).toLocaleString('tr-TR')} ₺ üzerinden onaylandı! Kargo kodunuz oluşturuldu.`,
                    link: `tickets.html`,
                    read: false,
                    createdAt: serverTimestamp()
                });
                await addDoc(collection(db, "notifications"), {
                    userEmail: targetSrv,
                    message: `✅ Müşteri tamir teklifini kabul etti. Cihazı kargo ile gönderecek.`,
                    link: `track.html?id=${ticketId}`,
                    read: false,
                    createdAt: serverTimestamp()
                });

                sendEmailNotification(
                    ticketData.userEmail,
                    "TeknikZeka: Tamir Teklifiniz Onaylandı!",
                    `${targetSrv} servisi ${Number(price).toLocaleString('tr-TR')} ₺ tamir teklifinizi kabul etti.\n\nAnlaşmalı Kargo Kodunuz: ${cargoCode}\n\nCihazınızı kargo şubesine bu kodla ücretsiz gönderebilirsiniz.`
                );
                sendEmailNotification(
                    targetSrv,
                    "TeknikZeka: Tamir İşi Onaylandı!",
                    `Müşteri ${Number(price).toLocaleString('tr-TR')} ₺ karşılığında cihazını tamiri için size yönlendirdi. Kargo ile gönderecek.`
                );
            }

            alert("Teklif kabul edildi! Müşteriye bildirim ve e-posta gönderildi.");

        } else {
            // Red: müşteriyi bilgilendir
            await addDoc(collection(db, "notifications"), {
                userEmail: ticketData.userEmail,
                message: `❌ ${targetSrv} servisi ${Number(price || 0).toLocaleString('tr-TR')} ₺ teklifinizi reddetti. Yeni bir teklif gönderebilirsiniz.`,
                link: `offer.html?ticketId=${ticketId}&serviceEmail=${encodeURIComponent(targetSrv)}&type=${offerType}`,
                read: false,
                createdAt: serverTimestamp()
            });
            alert("Teklif reddedildi. Müşteriye bildirim gönderildi.");
        }

    } catch (e) {
        console.error("Yanıt hatası:", e);
        alert("Bir hata oluştu, lütfen tekrar deneyin.");
        document.querySelectorAll('.offer-accept-btn, .offer-reject-btn').forEach(b => b.disabled = false);
    }
};

// --- KARşI TEKLİF GÖNDER (Servis) ---
window.serviceCounterOffer = async () => {
    const form       = document.getElementById('service-counter-form');
    const priceInput = document.getElementById('service-counter-price');
    const noteInput  = document.getElementById('service-counter-note');
    const price = parseInt(priceInput?.value, 10);

    if (isNaN(price) || price < 10) {
        alert('Lütfen geçerli bir fiyat giriniz.');
        return;
    }

    // Aralık doğrulaması — form'daki data-min / data-max değerlerinden okunur
    const minAllowed = parseInt(form?.dataset?.min || '0', 10);
    const maxAllowed = parseInt(form?.dataset?.max || '999999999', 10);
    if (price < minAllowed) {
        alert(`❌ Karşı teklifiniz müşterinin reddedilen teklifinin (${minAllowed.toLocaleString('tr-TR')} ₺) altına inemez.`);
        priceInput.value = minAllowed;
        priceInput.focus();
        return;
    }
    if (price > maxAllowed) {
        alert(`❌ Karşı teklifiniz orijinal teklifinizin (${maxAllowed.toLocaleString('tr-TR')} ₺) üstüne çıkamaz.`);
        priceInput.value = maxAllowed;
        priceInput.focus();
        return;
    }

    const note = noteInput?.value.trim() || '';

    const btn = document.querySelector('#service-counter-form button');
    if (btn) { btn.disabled = true; btn.textContent = 'Gönderiliyor...'; }

    try {
        await addDoc(collection(db, "negotiations"), {
            ticketId,
            serviceEmail: targetSrv,
            customerEmail: ticketData.userEmail,
            proposedBy: 'service',
            price,
            part: '',
            note,
            type: offerType,
            status: 'pending',
            createdAt: serverTimestamp()
        });

        // Müşteriye bildirim
        await addDoc(collection(db, "notifications"), {
            userEmail: ticketData.userEmail,
            message: `💬 Servis yeni bir karşı teklif gönderdi: ${price.toLocaleString('tr-TR')} ₺`,
            link: `offer.html?ticketId=${ticketId}&serviceEmail=${encodeURIComponent(targetSrv)}&type=${offerType}`,
            read: false,
            createdAt: serverTimestamp()
        });

        alert("Karşı teklifiniz müşteriye iletildi!");
    } catch (e) {
        console.error("Karşı teklif hatası:", e);
        alert("Teklif gönderilemedi, lütfen tekrar deneyin.");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Karşı Teklif Gönder'; }
    }
};

// --- MÜŞTERİ: SERVİS KARŞI TEKLİFİNE YANIT ---
window.customerRespondOffer = async (negId, response, price) => {
    const confirmMsg = response === 'accepted'
        ? `Servisin ${Number(price).toLocaleString('tr-TR')} ₺ karşı teklifini KABUL etmek istiyor musunuz?`
        : 'Bu teklifi REDDETMEK istiyor musunuz?';

    if (!confirm(confirmMsg)) return;

    document.querySelectorAll('.offer-accept-btn, .offer-reject-btn').forEach(b => b.disabled = true);

    try {
        await updateDoc(doc(db, "negotiations", negId), { status: response });

        if (response === 'accepted') {
            const cargoCode = generateCargoCode();

            if (offerType === 'sale') {
                await updateDoc(doc(db, "tickets", ticketId), {
                    assignedService: targetSrv,
                    status: "Satıldı",
                    acceptedPrice: price,
                    processStep: 0,
                    cargoCode,
                    cancellationRequested: false
                });
            } else {
                const existingOffer = ticketData.repairOffers?.[targetSrv] || {};
                let repairOffers = { ...(ticketData.repairOffers || {}) };
                repairOffers[targetSrv] = { ...existingOffer, price };

                await updateDoc(doc(db, "tickets", ticketId), {
                    assignedService: targetSrv,
                    status: "Servise Yönlendirildi",
                    processStep: 0,
                    cargoCode,
                    repairOffers,
                    cancellationRequested: false
                });
            }

            // Servise bildirim
            await addDoc(collection(db, "notifications"), {
                userEmail: targetSrv,
                message: `🎉 Müşteri ${Number(price).toLocaleString('tr-TR')} ₺ karşı teklifinizi kabul etti! Kargo kodu: ${cargoCode}`,
                link: `track.html?id=${ticketId}`,
                read: false,
                createdAt: serverTimestamp()
            });
            sendEmailNotification(
                targetSrv,
                "TeknikZeka: Karşı Teklifiniz Kabul Edildi!",
                `Müşteri ${Number(price).toLocaleString('tr-TR')} ₺ karşı teklifinizi kabul etti. Kargo kodu: ${cargoCode}`
            );
            alert("Teklif kabul edildi! Servis bilgilendirildi.");
        } else {
            // Red: servise bildirim
            await addDoc(collection(db, "notifications"), {
                userEmail: targetSrv,
                message: `❌ Müşteri karşı teklifinizi reddetti. Yeni teklif gönderebilirsiniz.`,
                link: `offer.html?ticketId=${ticketId}&serviceEmail=${encodeURIComponent(targetSrv)}&type=${offerType}`,
                read: false,
                createdAt: serverTimestamp()
            });
            alert("Teklif reddedildi. Servis bilgilendirildi.");
        }
    } catch (e) {
        console.error("Yanıt hatası:", e);
        alert("Bir hata oluştu, lütfen tekrar deneyin.");
        document.querySelectorAll('.offer-accept-btn, .offer-reject-btn').forEach(b => b.disabled = false);
    }
};
