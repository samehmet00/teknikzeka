// js/offer.js
// Fiyat Pazarlık Sayfası — Satış ve Tamir Teklifleri İçin
import { db, auth } from './firebase-config.js';
import {
    collection, query, where, orderBy, onSnapshot,
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

    // Servis tarafı: bekleme mesajı (başlangıçta göster, teklif gelince gizlenir)
    if (isService && serviceWaitEl) {
        serviceWaitEl.style.display = 'flex';
    }
}

// --- PAZARLIKLARı DİNLE (Realtime) ---
function listenToNegotiations() {
    const q = query(
        collection(db, "negotiations"),
        where("ticketId", "==", ticketId),
        where("serviceEmail", "==", targetSrv),
        orderBy("createdAt", "asc")
    );

    onSnapshot(q, (snapshot) => {
        renderHistory(snapshot);
        updateCurrentStatus(snapshot);
    });
}

// --- GEÇMİŞ RENDER ---
function renderHistory(snapshot) {
    if (!historyEl) return;

    if (snapshot.empty) {
        historyEl.innerHTML = '<div class="offer-history-empty">Henüz bir teklif gönderilmedi.</div>';
        return;
    }

    let html = '';
    let lastDoc = null;
    snapshot.forEach(d => { lastDoc = d; });

    snapshot.forEach(d => {
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

    historyEl.innerHTML = html;

    // Servis bekleme mesajını gizle (kayıt varsa)
    if (serviceWaitEl) serviceWaitEl.style.display = 'none';
}

// --- GÜNCEL DURUM BANNER ---
function updateCurrentStatus(snapshot) {
    if (!currentStatusEl) return;
    if (snapshot.empty) { currentStatusEl.style.display = 'none'; return; }

    // Son kaydı bul
    let lastNeg = null;
    snapshot.forEach(d => { lastNeg = d.data(); });

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
