import { db, auth } from './firebase-config.js';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { icons } from './icons.js';

// --- YARDIMCI FONKSİYONLAR ---
function generateCargoCode() {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
}

async function sendEmailNotification(toEmail, subject, message) {
    // Email gönderme fonksiyonunu çağırmak için emailjs'in window objesinde yüklü olmasını bekler
    if (typeof emailjs !== 'undefined') {
        try {
            await emailjs.send("service_u85t58o", "template_0a4enu5", { to_email: toEmail, subject: subject, message: message }, "_P1jn1r_0u2nA33Q3");
        } catch (err) { console.error("Mail hatası:", err); }
    }
}


function formatAIReport(reportString) {
    if (!reportString) return '';
    try {
        let cleanText = reportString.replace(/\*/g, '');
        let ariza = '', zorluk = 5, sure = '—', aciliyet = 'Orta', cozum = '';
        cleanText.split('\n').forEach(line => {
            const lower = line.toLowerCase();
            if (lower.includes('ariza:') || lower.includes('arıza:')) ariza = line.split(':').slice(1).join(':').trim();
            if (lower.includes('zorluk:')) zorluk = parseInt(line.split(':').slice(1).join(':').trim().replace(/\D/g, '')) || 5;
            if (lower.includes('sure:') || lower.includes('süre:')) sure = line.split(':').slice(1).join(':').trim();
            if (lower.includes('aciliyet:')) aciliyet = line.split(':').slice(1).join(':').trim();
            if (lower.includes('cozum:') || lower.includes('çözüm:') || lower.includes('öneri:')) cozum = line.split(':').slice(1).join(':').trim();
        });
        // Eski format fallback (Arıza: ... Zorluk: ... Öneri:)
        if (!ariza || !cozum) {
            const p = reportString.split('Zorluk:');
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

            ${cozum ? `<div class="ai-diag-solution">
                <div class="ai-diag-sol-label">Çözüm Önerisi</div>
                <div class="ai-diag-sol-text">${cozum}</div>
            </div>` : ''}
        </div>
        `;
    } catch (e) {
        return `<div class="ai-diag-card" style="padding:1rem; font-size:0.88rem; color:var(--text-main);">${reportString}</div>`;
    }
}

// --- GLOBAL METOTLAR ---

window.currentTab = 'pending';
window.switchTab = (tabName, event) => {
    window.currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event) event.currentTarget.classList.add('active');

    const allWrappers = document.querySelectorAll('.ticket-wrapper');
    let visibleCount = 0;
    allWrappers.forEach(wrapper => {
        const state = wrapper.getAttribute('data-state');
        const show = state === tabName;
        wrapper.style.display = show ? 'block' : 'none';
        if (show) visibleCount++;
    });

    // Boş durum mesajı
    const emptyEl = document.getElementById('tickets-empty-state');
    if (emptyEl) emptyEl.remove();
    if (visibleCount === 0) {
        const labels = { pending: 'Bekleyen kaydınız bulunmuyor.', active: 'Aktif işleminiz bulunmuyor.', completed: 'Tamamlanan işleminiz bulunmuyor.' };
        const div = document.createElement('div');
        div.id = 'tickets-empty-state';
        div.style.cssText = 'text-align:center; padding:3rem 1rem; color:var(--gray-light); font-size:0.95rem;';
        div.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:1rem; opacity:0.4;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><br>${labels[tabName] || 'Kayıt bulunamadı.'}`;
        document.getElementById('ticket-list').appendChild(div);
    }
};

window.toggleSwipe = (event, el) => {
    if (window.innerWidth > 768) return; // Sadece mobilde toggle mantığı
    if (event.target.tagName.toLowerCase() === 'button' || event.target.closest('a')) return;
    el.classList.toggle('swiped');
};

window.initSwipeMenu = () => {
    // Swipe-to-delete disabled: delete button is always visible as top-right icon
    // Cards no longer slide left on mobile
};

window.deleteTicket = async (ticketId, event) => {
    if (event) event.stopPropagation();
    // Sadece aktif (assignedService var ama henüz tamamlanmamış) kayıtlar silinemez
    const snap = await getDoc(doc(db, 'tickets', ticketId));
    if (snap.exists()) {
        const d = snap.data();
        if (d.assignedService && !d.processCompleted) {
            alert('Bu kayıt şu anda aktif bir servise bağlı. Silmek yerine "İşlemi İptal Et" butonunu kullanın.');
            return;
        }
    }
    if (confirm('Bu kaydı kalıcı olarak silmek istediğinize emin misiniz?')) {
        try { await deleteDoc(doc(db, 'tickets', ticketId)); } catch (e) { alert('Silinirken bir hata oluştu.'); }
    }
};

window.requestCancelTicket = async (ticketId, serviceEmail, event) => {
    if (event) event.stopPropagation();

    // İşlem tamamlanmışsa iptal edilemez
    const snap = await getDoc(doc(db, 'tickets', ticketId));
    if (snap.exists() && snap.data().processCompleted) {
        alert('Bu işlem zaten tamamlanmış, iptal edilemez.');
        return;
    }

    if (!confirm('Bu işlemi iptal etmek istediğinize emin misiniz? Servis iptal talebinizi görecek ve onaylayacak.')) return;
    try {
        await updateDoc(doc(db, 'tickets', ticketId), { cancellationRequested: true });
        await addDoc(collection(db, 'notifications'), {
            userEmail: serviceEmail,
            message: 'Müşteri bu işlemi iptal etmek istiyor. Lütfen servis panelinizden onaylayın.',
            link: 'service.html',
            read: false,
            createdAt: serverTimestamp()
        });
        alert('İptal talebiniz servise iletildi. Servis onayladığında kayıt serbest kalacak.');
    } catch (e) { console.error('İptal hatası:', e); alert('Hata oluştu.'); }
};

window.selectService = async (ticketId, serviceEmail, event) => {
    if (event) event.stopPropagation();
    const cargoCode = generateCargoCode();
    try {
        await updateDoc(doc(db, "tickets", ticketId), { assignedService: serviceEmail, status: "Servise Yönlendirildi", processStep: 0, cargoCode: cargoCode });
        await addDoc(collection(db, "notifications"), { userEmail: serviceEmail, message: "🎉 Bir müşteri tamir için sizi seçti!", link: `track.html?id=${ticketId}`, read: false, createdAt: serverTimestamp() });
        sendEmailNotification(serviceEmail, "TeknikZeka: Yeni Bir Tamir İşiniz Var!", `Harika haber! Bir müşteri cihazının tamiri için sizi seçti. Sisteme girerek işlemlere başlayabilirsiniz.`);
        sendEmailNotification(auth.currentUser.email, "TeknikZeka: Kargo Kodunuz Oluşturuldu", `Cihazınızı tamir için ${serviceEmail} servisine yönlendirdiniz.\n\nAnlaşmalı Kargo Kodunuz: ${cargoCode}\n\nLütfen cihazınızı güzelce paketleyip Yurtiçi Kargo şubesine bu kod ile teslim ediniz.`);
        alert(`${serviceEmail} servisini seçtiniz! Kargo kodunuz oluşturuldu.`);
    } catch (error) { console.error("Hata:", error); }
};

window.acceptOffer = async (ticketId, serviceEmail, price, event) => {
    if (event) event.stopPropagation();
    if (confirm(`${price.toLocaleString('tr-TR')} ₺ teklifi kabul etmek istediğinize emin misiniz?`)) {
        const cargoCode = generateCargoCode();
        try {
            await updateDoc(doc(db, "tickets", ticketId), { assignedService: serviceEmail, status: "Satıldı", acceptedPrice: price, processStep: 0, cargoCode: cargoCode, cancellationRequested: false });
            await addDoc(collection(db, "notifications"), { userEmail: serviceEmail, message: `🤝 Müşteri cihazını size satmayı kabul etti! (${price.toLocaleString('tr-TR')} ₺)`, link: `track.html?id=${ticketId}`, read: false, createdAt: serverTimestamp() });
            sendEmailNotification(serviceEmail, "TeknikZeka: Teklifiniz Kabul Edildi!", `Tebrikler! Müşteri ${price.toLocaleString('tr-TR')} ₺ tutarındaki teklifinizi kabul etti. Müşteri cihazı kargoya vermek üzere yönlendirildi.`);
            sendEmailNotification(auth.currentUser.email, "TeknikZeka: Satış Onaylandı & Kargo Kodunuz", `Cihazınızı ${serviceEmail} servisine ${price.toLocaleString('tr-TR')} ₺ karşılığında satmayı kabul ettiniz.\n\nAnlaşmalı Kargo Kodunuz: ${cargoCode}\n\nLütfen cihazınızı güvenli bir şekilde paketleyip kargo şubesine bu kod ile teslim ediniz. Cihaz servise ulaştığında ödemeniz hesabınıza aktarılacaktır.`);
            alert("Teklifi kabul ettiniz! Kargo kodunuz ekranda belirmiştir.");
        } catch (error) { console.error("Hata:", error); }
    }
};

window.counterOffer = (ticketId, serviceEmail, event) => {
    if (event) event.stopPropagation();
    window.location.href = `offer.html?ticketId=${ticketId}&serviceEmail=${encodeURIComponent(serviceEmail)}&type=sale`;
};

// --- BİLETLERİ YÜKLEME ---
const ticketList = document.getElementById('ticket-list');

// --- RATING MODAL LOGIC ---
let currentReviewTicketId = null;
let currentReviewService = null;
let selectedRating = 0;

window.openReviewModal = (ticketId, serviceEmail, event) => {
    if (event) event.stopPropagation();
    currentReviewTicketId = ticketId;
    currentReviewService = serviceEmail;
    selectedRating = 0;
    document.getElementById('rating-service-name').innerText = `${serviceEmail} - deneyiminizi puanlayın`;
    document.getElementById('rating-comment').value = '';
    updateStars(0);
    document.getElementById('rating-modal').classList.add('open');
};

const updateStars = (rating) => {
    document.querySelectorAll('#star-rating span').forEach(s => {
        const starVal = parseInt(s.getAttribute('data-val'));
        if (starVal <= Math.floor(rating)) {
            s.style.background = 'none';
            s.style.webkitTextFillColor = 'initial';
            s.style.color = '#F59E0B';
        } else if (starVal === Math.ceil(rating) && !Number.isInteger(rating)) {
            s.style.background = `linear-gradient(90deg, #F59E0B 50%, var(--border-color) 50%)`;
            s.style.webkitBackgroundClip = 'text';
            s.style.webkitTextFillColor = 'transparent';
            s.style.color = 'transparent';
        } else {
            s.style.background = 'none';
            s.style.webkitTextFillColor = 'initial';
            s.style.color = 'var(--border-color)';
        }
    });
};

document.querySelectorAll('#star-rating span').forEach(star => {
    star.addEventListener('mousemove', (e) => {
        const rect = e.target.getBoundingClientRect();
        const starVal = parseInt(e.target.getAttribute('data-val'));
        const isHalf = (e.clientX - rect.left) < (rect.width / 2);
        const hoveredRating = isHalf ? starVal - 0.5 : starVal;

        updateStars(hoveredRating);
        document.querySelectorAll('#star-rating span').forEach(s => {
            s.style.transform = parseInt(s.getAttribute('data-val')) === starVal ? 'scale(1.2)' : 'scale(1)';
        });
    });
    star.addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();
        const starVal = parseInt(e.target.getAttribute('data-val'));
        const isHalf = (e.clientX - rect.left) < (rect.width / 2);
        selectedRating = isHalf ? starVal - 0.5 : starVal;

        updateStars(selectedRating);
        document.querySelectorAll('#star-rating span').forEach(s => s.style.transform = 'scale(1)');
    });
});
document.getElementById('star-rating')?.addEventListener('mouseleave', () => {
    updateStars(selectedRating);
    document.querySelectorAll('#star-rating span').forEach(s => s.style.transform = 'scale(1)');
});

document.getElementById('submit-rating-btn')?.addEventListener('click', async () => {
    if (selectedRating === 0) {
        alert("Lütfen en az 1 yıldız verin.");
        return;
    }
    const comment = document.getElementById('rating-comment').value.trim();

    try {
        const submitBtn = document.getElementById('submit-rating-btn');
        submitBtn.innerText = "Gönderiliyor...";
        submitBtn.disabled = true;

        // Save review
        await addDoc(collection(db, "reviews"), {
            ticketId: currentReviewTicketId,
            serviceEmail: currentReviewService,
            userEmail: auth.currentUser.email,
            rating: selectedRating,
            comment: comment,
            createdAt: serverTimestamp()
        });

        // Update ticket to hide button
        await updateDoc(doc(db, "tickets", currentReviewTicketId), {
            isReviewed: true
        });

        alert("Değerlendirmeniz için teşekkürler!");
        document.getElementById('rating-modal').classList.remove('open');
    } catch (err) {
        console.error(err);
        alert("Değerlendirme gönderilirken hata oluştu.");
    } finally {
        const submitBtn = document.getElementById('submit-rating-btn');
        submitBtn.innerText = "Gönder";
        submitBtn.disabled = false;
    }
});
// ----------------------------

onAuthStateChanged(auth, async (user) => {
    if (user && ticketList) {

        // Önbelleğten anında yükle — butonlar window scope'ta kayıtlı olduğundan çalışır
        const cachedHtml = localStorage.getItem('tz_customer_tickets_cache');
        if (cachedHtml) {
            ticketList.innerHTML = cachedHtml;
            window.switchTab(window.currentTab, null);
        } else {
            ticketList.innerHTML = `
                <div class="skeleton-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width:70%;"></div><div class="skeleton skeleton-badge"></div></div>
                <div class="skeleton-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width:70%;"></div><div class="skeleton skeleton-badge"></div></div>
                <div class="skeleton-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width:70%;"></div><div class="skeleton skeleton-badge"></div></div>
            `;
        }

        const q = query(collection(db, "tickets"), where("userEmail", "==", user.email));
        onSnapshot(q, async (querySnapshot) => {
            let generatedHtml = '';

            if (querySnapshot.empty) {
                generatedHtml = '<p style="color:var(--gray-light); text-align:center; padding:2rem;">Henüz bir arıza kaydınız bulunmuyor.</p>';
                ticketList.innerHTML = generatedHtml;
                // Ham veriyi temizle
                localStorage.removeItem('tz_customer_tickets_cache');
                return;
            }

            // Fetch Reviews
            const reviewsSnap = await getDocs(collection(db, "reviews"));
            const serviceRatings = {};
            reviewsSnap.forEach(r => {
                const rData = r.data();
                if (!serviceRatings[rData.serviceEmail]) serviceRatings[rData.serviceEmail] = { sum: 0, count: 0 };
                serviceRatings[rData.serviceEmail].sum += rData.rating;
                serviceRatings[rData.serviceEmail].count += 1;
            });

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
                if (data.createdAt) {
                    const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                }

                let cargoHtml = data.cargoCode ? `
                <div style="margin-top: 15px; padding: 12px; background: rgba(16,185,129,0.1); border: 1px dashed #10B981; border-radius: 8px;">
                    <span style="color: #10B981; font-weight: bold; display: flex; align-items:center; gap:5px; margin-bottom: 5px;">${icons.package} Anlaşmalı Kargo Kodunuz:</span>
                    <span style="font-size: 1.4rem; letter-spacing: 2px; color: var(--text-main); font-weight: 800;">${data.cargoCode}</span>
                    <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: var(--gray-light);">Cihazınızı paketleyip kargo şubesine sadece bu kodu söyleyerek ücretsiz gönderebilirsiniz.</p>
                </div>` : '';

                let bidHtml = '';
                if (data.isForSale) {
                    if (data.status === "Satıldı") {
                        const saleRatingData = serviceRatings[data.assignedService];
                        let saleRatingInfoHtml = '';
                        if (saleRatingData && saleRatingData.count > 0) {
                            const avg = (saleRatingData.sum / saleRatingData.count).toFixed(1);
                            saleRatingInfoHtml = `<div style="display:flex; align-items:center; gap:6px; margin-top:5px; font-size:0.85rem;"><span style="color:var(--gray-light);">Servis Puani:</span><span style="display:inline-flex; align-items:center; gap:3px; color:#F59E0B; font-weight:700;"><svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>${avg} (${saleRatingData.count})</span></div>`;
                        }
                        bidHtml = `
                        <div class="success-box-dynamic" style="display:flex; flex-direction:column; gap:10px;">
                            <div>
                            <span style="display:flex; align-items:center; gap:5px;">${icons.check} Cihaziniz <a href="service-reviews.html?email=${encodeURIComponent(data.assignedService)}" onclick="event.stopPropagation()" style="text-decoration:underline; color:inherit; font-weight:700;">${data.assignedService}</a> servisine ${data.acceptedPrice.toLocaleString('tr-TR')} TL'ye satildi!</span>
                            ${saleRatingInfoHtml}
                        </div>
                            ${cargoHtml}
                            <div style="display:flex; gap:10px; margin-top: 4px;">
                                <a href="track.html?id=${ticketId}" style="flex:1; text-align:center; padding:8px 10px; background: linear-gradient(135deg, #10B981, #059669); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; display:flex; align-items:center; justify-content:center; gap:5px;">Sureci Takip Et ${icons.truck}</a>
                                <a href="chat.html?ticketId=${ticketId}" style="flex:1; text-align:center; padding:8px 10px; background: transparent; border: 1px solid #10B981; color: #10B981; text-decoration: none; border-radius: 8px; font-weight: bold; display:flex; align-items:center; justify-content:center; gap:5px;">${icons.chat} Mesajlas</a>
                            </div>
                        </div>`;
                    } else {
                        bidHtml = `<div class="info-box-dynamic"><strong style="display:flex;align-items:center;gap:5px;">${icons.money} Servislerden Gelen Fiyat Teklifleri:</strong><br>`;
                        bidHtml += `<span style="display:flex;align-items:center;gap:5px;font-size:0.85rem;margin-top:4px;margin-bottom:4px;">İlgili Servisin Sayfası için Mail'in Üzerine Tıklayınız...</span>`;
                        const offerKeys = data.offers ? Object.keys(data.offers) : [];
                        if (offerKeys.length > 0) {
                            offerKeys.sort((a, b) => {
                                let pa = data.offers[a]; if (typeof pa === 'object') pa = pa.price || 0;
                                let pb = data.offers[b]; if (typeof pb === 'object') pb = pb.price || 0;
                                return Number(pb) - Number(pa);
                            });
                            const highestOfferSrv = offerKeys[0];
                            offerKeys.forEach(srv => {
                                let offerPrice = data.offers[srv];
                                if (typeof offerPrice === 'object') offerPrice = offerPrice.price || 0;
                                offerPrice = Number(offerPrice);
                                const isHighest = srv === highestOfferSrv;

                                let ratingHtml = '';
                                if (serviceRatings[srv]) {
                                    const avg = (serviceRatings[srv].sum / serviceRatings[srv].count).toFixed(1);
                                    ratingHtml = `<span style="font-size:0.8rem; color:#F59E0B; margin-left:5px;">★ ${avg} (${serviceRatings[srv].count})</span>`;
                                } else {
                                    ratingHtml = `<span style="font-size:0.8rem; color:#94A3B8; margin-left:5px;">★ Yeni</span>`;
                                }

                                bidHtml += `
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding:10px; background:rgba(0,0,0,0.1); border-radius:8px; gap:8px;">
                                    <span style="font-size:0.95rem; flex:1; min-width:0;"><a href="service-reviews.html?email=${encodeURIComponent(srv)}" onclick="event.stopPropagation()" style="text-decoration:underline; color:inherit; font-weight:700;">${srv}</a> ${ratingHtml}: <strong style="font-size: 1.1rem; color: #10B981;">${offerPrice.toLocaleString('tr-TR')} ₺</strong>${isHighest ? ' <span style="font-size:0.72rem; background:rgba(16,185,129,0.15); color:#10B981; border-radius:4px; padding:1px 6px; margin-left:4px;">EN YÜKSEK</span>' : ''}</span>
                                    <div style="display:flex; gap:6px; flex-shrink:0;">
                                        <button onclick="window.counterOffer('${ticketId}', '${srv}', event)" style="background:transparent; border:1px solid #10B981; padding:6px 12px; border-radius:6px; color:#10B981; font-weight:bold; cursor:pointer; white-space:nowrap;">💬 Pazarlık</button>
                                        ${isHighest ? `<button onclick="window.acceptOffer('${ticketId}', '${srv}', ${offerPrice}, event)" style="background:#10B981; border:none; padding:6px 15px; border-radius:6px; color:white; font-weight:bold; cursor:pointer; white-space:nowrap;">Kabul Et</button>` : ''}
                                    </div>
                                </div>`;
                            });
                        } else { bidHtml += `<span style="font-size:0.85rem; display:flex; align-items:center; gap:5px;">${icons.clock} Henüz fiyat teklifi gelmedi...</span>`; }
                        bidHtml += `</div>`;
                    }
                } else {
                    if (data.assignedService) {
                        const ratingData = serviceRatings[data.assignedService];
                        let ratingInfoHtml = '';
                        if (ratingData && ratingData.count > 0) {
                            const avg = (ratingData.sum / ratingData.count).toFixed(1);
                            ratingInfoHtml = `
                            <div style="display:flex; align-items:center; gap:6px; margin-top:6px; font-size:0.85rem;">
                                <span style="color:var(--gray-light);">Servis Puani:</span>
                                <span style="display:inline-flex; align-items:center; gap:4px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.2); padding:2px 10px; border-radius:20px; font-weight:700; color:#F59E0B;">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    ${avg} <span style="font-weight:400; color:var(--gray-light);">(${ratingData.count})</span>
                                </span>
                            </div>`;
                        } else {
                            ratingInfoHtml = `<div style="font-size:0.8rem; color:var(--gray-light); margin-top:4px;">Bu servis henuz degerlendirilmemis.</div>`;
                        }

                        bidHtml = `
                        <div class="success-box-dynamic" style="display:flex; flex-direction:column; gap:8px;">
                            <div>
                                <span style="display:flex;align-items:center;gap:5px;">${icons.check} Cihaziniz <a href="service-reviews.html?email=${encodeURIComponent(data.assignedService)}" onclick="event.stopPropagation()" style="font-weight:700; text-decoration:underline; color:inherit;">${data.assignedService}</a> isimli servise yonlendirildi.</span>
                                ${ratingInfoHtml}
                            </div>
                            ${cargoHtml}
                            <div style="display:flex; gap:10px; margin-top: 4px;">
                                <a href="track.html?id=${ticketId}" style="flex:1; text-align:center; padding:8px 10px; background: linear-gradient(135deg, var(--primary), #4338ca); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; display:flex;align-items:center;justify-content:center;gap:5px;">Sureci Takip Et ${icons.truck}</a>
                                <a href="chat.html?ticketId=${ticketId}" style="flex:1; text-align:center; padding:8px 10px; background: transparent; border: 1px solid #10B981; color: #10B981; text-decoration: none; border-radius: 8px; font-weight: bold; display:flex;align-items:center;justify-content:center;gap:5px;">${icons.chat} Mesajlas</a>
                            </div>
                        </div>`;
                    }
                    else if (data.interestedServices && data.interestedServices.length > 0) {
                        bidHtml = `<div class="info-box-dynamic"><strong style="display:flex;align-items:center;gap:5px;">${icons.party} Bu cihazı tamir edebilecek servisler:</strong><br>`;
                        bidHtml += `<span style="display:flex;align-items:center;gap:5px;font-size:0.85rem;margin-top:4px;margin-bottom:4px;">İlgili Servisin Sayfası için Mail'in Üzerine Tıklayınız...</span>`;
                        data.interestedServices.forEach(srv => {
                            let ratingHtml = '';
                            if (serviceRatings[srv]) {
                                const avg = (serviceRatings[srv].sum / serviceRatings[srv].count).toFixed(1);
                                ratingHtml = `<span style="font-size:0.8rem; color:#F59E0B; margin-left:5px;">★ ${avg} (${serviceRatings[srv].count})</span>`;
                            } else {
                                ratingHtml = `<span style="font-size:0.8rem; color:#94A3B8; margin-left:5px;">★ Yeni</span>`;
                            }

                            const hasRepairOffer = data.repairOffers && data.repairOffers[srv];
                            let offerDetailsHtml = '';
                            if (hasRepairOffer) {
                                offerDetailsHtml = `<div style="font-size:0.85rem; color:#f0fdf4; margin-top:4px; opacity:0.9;">Fiyat: <strong>${data.repairOffers[srv].price.toLocaleString('tr-TR')} ₺</strong> &nbsp;|&nbsp; Parça: <strong>${data.repairOffers[srv].part}</strong></div>`;
                            }

                            bidHtml += `<div style="margin-top:8px; background: #10B981; padding: 8px 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap:8px;">
                                <div style="min-width:0; flex:1;">
                                    <a href="service-reviews.html?email=${encodeURIComponent(srv)}" onclick="event.stopPropagation()" style="color:white; text-decoration:underline; font-weight:bold;">${srv}</a> ${ratingHtml}
                                    ${offerDetailsHtml}
                                </div>
                                <div style="display:flex; gap:6px; flex-shrink:0;">
                                    ${hasRepairOffer ? `<a href="offer.html?ticketId=${ticketId}&serviceEmail=${encodeURIComponent(srv)}&type=repair" onclick="event.stopPropagation()" style="background:white; color:#10B981; padding:5px 10px; border-radius:6px; font-weight:bold; text-decoration:none; font-size:0.82rem; display:inline-flex; align-items:center; gap:4px; white-space:nowrap;">💬 Pazarlık</a>` : ''}
                                    ${hasRepairOffer
                                    ? `<button onclick="window.selectService('${ticketId}', '${srv}', event)" style="background: rgba(0,0,0,0.2); color: white; padding: 5px 12px; border:none; border-radius: 6px; font-weight:bold; cursor:pointer; white-space:nowrap;">Kabul Et</button>`
                                    : `<button onclick="window.selectService('${ticketId}', '${srv}', event)" style="background: rgba(0,0,0,0.2); color: white; padding: 5px 12px; border:none; border-radius: 6px; font-weight:bold; cursor:pointer; white-space:nowrap;">Seç</button>`}
                                </div>
                            </div>`;
                        });
                        bidHtml += `</div>`;
                    } else if (!data.assignedService) {
                        // Henüz hiçbir servis ilgi göstermedi — bekleyen durum
                        bidHtml = `<div class="info-box-dynamic">
                            <strong style="display:flex;align-items:center;gap:5px;">${icons.clock} Servislerden Gelen Teklifler:</strong><br>
                            <span style="display:flex;align-items:center;gap:5px;font-size:0.85rem;margin-top:4px;margin-bottom:4px;">İlgili Servisin Sayfası için Mail'in Üzerine Tıklayınız...</span>
                            <span style="font-size:0.85rem; display:flex; align-items:center; gap:5px;">${icons.clock} Henüz tamir teklifi gelmedi...</span>
                        </div>`;
                    }
                }

                let reviewHtml = '';
                if (data.assignedService && data.processCompleted && !data.isReviewed) {
                    reviewHtml = `
                    <div style="margin-top: 15px;">
                        <button onclick="window.openReviewModal('${ticketId}', '${data.assignedService}', event)" style="width: 100%; background: linear-gradient(135deg, #F59E0B, #D97706); padding: 12px; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(245,158,11,0.3); transition: 0.2s;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            Servisi Degerlendir
                        </button>
                    </div>`;
                } else if (data.assignedService && data.processCompleted && data.isReviewed) {
                    reviewHtml = `<div style="margin-top:12px; text-align:center; font-size:0.85rem; color:#10B981; display:flex; align-items:center; justify-content:center; gap:5px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Degerlendirmeniz iletildi, tesekkurler!
                    </div>`;
                }

                // Ticket durumunu belirle
                let ticketState = 'pending';
                if (data.processCompleted) {
                    ticketState = 'completed';
                } else if (data.assignedService) {
                    ticketState = 'active';
                }
                const statusClass = data.status === 'Bekliyor' ? 'status-bekliyor' : 'status-onaylandi';

                // Durum bazlı aksiyon butonu
                let actionBtn = '';
                if (ticketState === 'active') {
                    if (data.cancellationRequested) {
                        actionBtn = `<div style="margin-top:8px; padding:8px 12px; background:rgba(245,158,11,0.1); border:1px solid #F59E0B; border-radius:8px; font-size:0.82rem; color:#D97706; display:flex; align-items:center; gap:6px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            İptal talebi gönderildi — servis onayı bekleniyor.
                        </div>`;
                    } else {
                        actionBtn = `<button onclick="window.requestCancelTicket('${ticketId}', '${data.assignedService}', event)" style="margin-top:8px; width:100%; padding:9px; background:transparent; border:1.5px solid #EF4444; color:#EF4444; border-radius:8px; font-weight:700; font-size:0.85rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.08)'" onmouseout="this.style.background='transparent'">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            İşlemi İptal Et
                        </button>`;
                    }
                }

                generatedHtml += `
                    <div class="ticket-wrapper" data-state="${ticketState}">
                        ${ticketState !== 'active' ? `<div class="delete-action-btn" onclick="window.deleteTicket('${ticketId}', event)" title="Kaydı Sil"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></div>` : ''}
                        <div class="modern-ticket-card" onclick="window.toggleSwipe(event, this)">
                            <div class="modern-ticket-header">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <span style="font-size:1.8rem; background:rgba(79,70,229,0.1); border-radius:12px; padding:5px; display:inline-flex; align-items:center; justify-content:center;">${icons.phone}</span>
                                    <div>
                                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                            <h4 style="margin:0; font-size:1.05rem; color:var(--text-main);">${deviceInfo}</h4>
                                            ${data.isForSale
                        ? '<span style="font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:10px; background:rgba(16,185,129,0.12); color:#10B981; border:1px solid #10B98140;">₺ Satılık</span>'
                        : '<span style="font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:10px; background:rgba(79,70,229,0.1); color:var(--primary); border:1px solid rgba(79,70,229,0.2);">🔧 Tamir</span>'}
                                        </div>
                                        <span style="font-size:0.78rem; color:#94A3B8; display:flex; align-items:center; gap:3px;">${icons.calendar} ${dateStr} <span class="ticket-id-sep"></span> #${ticketId.slice(0, 6).toUpperCase()}</span>
                                    </div>
                                </div>
                                <span class="status-pill ${statusClass}">${data.status}</span>
                            </div>
                            <div><p style="color:var(--text-main); font-size:0.92rem;"><strong>Şikayet:</strong> ${data.description}</p></div>
                             ${formatAIReport(data.aiReport)}
                            ${bidHtml}
                            ${reviewHtml}
                            ${actionBtn}
                        </div>
                    </div>
                `;
            });

            ticketList.innerHTML = generatedHtml;

            // Önbelleğe kaydet — bir sonraki açılışta anında göster
            localStorage.setItem('tz_customer_tickets_cache', generatedHtml);

            // Sayaclar
            const pendingCount = myTickets.filter(t => !t.assignedService && !t.processCompleted).length;
            const activeCount = myTickets.filter(t => t.assignedService && !t.processCompleted).length;
            const completedCount = myTickets.filter(t => !!t.processCompleted).length;
            const pendingBadge = document.getElementById('pending-badge');
            const activeBadge = document.getElementById('active-badge');
            const completedBadge = document.getElementById('completed-badge');
            if (pendingBadge) {
                pendingBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
                pendingBadge.innerText = pendingCount;
            }
            if (activeBadge) {
                activeBadge.style.display = activeCount > 0 ? 'inline-block' : 'none';
                activeBadge.innerText = activeCount;
            }
            if (completedBadge) {
                completedBadge.style.display = completedCount > 0 ? 'inline-block' : 'none';
                completedBadge.innerText = completedCount;
            }

            // Mevcut tab gorunumunu yenile
            window.switchTab(window.currentTab, null);
            window.initSwipeMenu();
        });
    }
});