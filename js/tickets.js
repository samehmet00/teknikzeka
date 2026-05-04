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
        const wantsEmail = confirm(`Bu bildirim e-posta ile de gönderilsin mi?\nAlıcı: ${toEmail}`);
        if (wantsEmail) {
            try {
                await emailjs.send("service_u85t58o", "template_0a4enu5", { to_email: toEmail, subject: subject, message: message }, "_P1jn1r_0u2nA33Q3");
            } catch (err) { console.error("Mail hatası:", err); }
        }
    }
}

function formatAIReport(reportString) {
    if (!reportString) return '';
    try {
        const parts = reportString.split('Zorluk:');
        let issue = parts[0].replace('Arıza:', '').trim();
        let difficultyPart = parts[1].split('Öneri:');
        let difficulty = difficultyPart[0].trim();
        let solution = difficultyPart[1].trim();

        let diffColor = '#10B981';
        let diffNum = parseInt(difficulty) || 1;
        if (diffNum > 4 && diffNum < 8) diffColor = '#F59E0B';
        if (diffNum >= 8) diffColor = '#EF4444';
        let diffPct = (diffNum / 10) * 100;

        return `
        <div class="premium-ai-box" style="margin-top: 1.5rem; border-left: 4px solid var(--primary); padding-left: 1.2rem;">
            <h4 style="margin: 0 0 1rem 0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--primary); display: flex; align-items: center; gap: 6px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg> Yapay Zekâ Ön Teşhisi
            </h4>
            <div class="ai-detail-row">
                <div style="flex:1;">
                    <span style="font-size:0.8rem; color:#94A3B8; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">Tespit Edilen Arıza</span>
                    <p style="margin:2px 0 0; color:var(--text-main); font-size:1rem; line-height:1.4; font-weight: 500;">${issue}</p>
                </div>
            </div>
            <div class="ai-detail-row" style="margin-top: 12px;">
                <div style="flex:1;">
                    <span style="font-size:0.8rem; color:#94A3B8; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">Onarım Zorluğu: <span style="color:${diffColor};">${difficulty}/10</span></span>
                    <div class="difficulty-track" style="height: 10px; background: rgba(0,0,0,0.1); border-radius: 10px; margin-top: 6px; overflow: hidden; border: 1px solid var(--border-color);">
                        <div class="difficulty-fill" style="width: ${diffPct}%; background: ${diffColor}; height: 100%; border-radius: 10px; transition: width 1s ease;"></div>
                    </div>
                </div>
            </div>
            <div class="ai-detail-row" style="margin-top: 12px;">
                <div style="flex:1;">
                    <span style="font-size:0.8rem; color:#94A3B8; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">Çözüm Önerisi</span>
                    <p style="margin:2px 0 0; color:var(--text-main); font-size:0.95rem; line-height:1.4; opacity: 0.9;">${solution}</p>
                </div>
            </div>
        </div>
        `;
    } catch (e) {
        return `<div class="ai-report-box"><strong>${icons.bot} Yapay Zekâ Özeti:</strong><br>${reportString}</div>`;
    }
}

// --- GLOBAL METOTLAR ---
window.currentTab = 'all';
window.switchTab = (tabName, event) => {
    window.currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event) event.target.classList.add('active');

    const allTickets = document.querySelectorAll('.ticket-wrapper');
    allTickets.forEach(wrapper => {
        const isAssigned = wrapper.innerHTML.includes('status-onaylandi') || wrapper.innerHTML.includes('Satıldı');
        wrapper.style.display = (tabName === 'active' && !isAssigned) ? 'none' : 'block';
    });
};

window.toggleSwipe = (event, el) => {
    if (window.innerWidth > 768) return; // Sadece mobilde toggle mantığı
    if (event.target.tagName.toLowerCase() === 'button' || event.target.closest('a')) return;
    el.classList.toggle('swiped');
};

window.initSwipeMenu = () => {
    const cards = document.querySelectorAll('.modern-ticket-card');
    cards.forEach(card => {
        if (card.dataset.swipeInitialized) return;
        card.dataset.swipeInitialized = "true";
        let startX = 0, startY = 0, currentX = 0, currentY = 0, isDragging = false, isScrolling = false; const threshold = 50;

        const startDrag = (e) => {
            if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('a') || e.target.closest('button')) return;
            startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
            startY = e.type.includes('mouse') ? e.pageY : e.touches[0].clientY;
            isDragging = true; isScrolling = false; card.style.transition = 'none';
            document.querySelectorAll('.modern-ticket-card.swiped').forEach(el => { if (el !== card) { el.classList.remove('swiped'); el.style.transform = ''; } });
        };
        const onDrag = (e) => {
            if (!isDragging) return;
            currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
            currentY = e.type.includes('mouse') ? e.pageY : e.touches[0].clientY;
            const diffX = currentX - startX;
            const diffY = currentY - startY;
            if (Math.abs(diffY) > Math.abs(diffX)) { isScrolling = true; }
            if (isScrolling) return;
            if (diffX < 0 && diffX > -100) card.style.transform = `translateX(${diffX}px)`;
        };
        const endDrag = (e) => {
            if (!isDragging) return;
            isDragging = false; card.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            if (isScrolling) return;
            const diffX = currentX - startX;
            if (diffX < -threshold) { card.classList.add('swiped'); card.style.transform = 'translateX(-80px)'; }
            else { card.classList.remove('swiped'); card.style.transform = 'translateX(0)'; }
        };
        card.addEventListener('touchstart', startDrag, { passive: true }); card.addEventListener('touchmove', onDrag, { passive: true }); card.addEventListener('touchend', endDrag);
    });
};

window.deleteTicket = async (ticketId, event) => {
    if (event) event.stopPropagation();
    if (confirm("Bu kaydı silmek istediğinize emin misiniz?")) {
        try { await deleteDoc(doc(db, "tickets", ticketId)); } catch (error) { alert("Silinirken bir hata oluştu."); }
    }
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
            await updateDoc(doc(db, "tickets", ticketId), { assignedService: serviceEmail, status: "Satıldı", acceptedPrice: price, processStep: 0, cargoCode: cargoCode });
            await addDoc(collection(db, "notifications"), { userEmail: serviceEmail, message: `🤝 Müşteri cihazını size satmayı kabul etti! (${price.toLocaleString('tr-TR')} ₺)`, link: `track.html?id=${ticketId}`, read: false, createdAt: serverTimestamp() });
            sendEmailNotification(serviceEmail, "TeknikZeka: Teklifiniz Kabul Edildi!", `Tebrikler! Müşteri ${price.toLocaleString('tr-TR')} ₺ tutarındaki teklifinizi kabul etti. Müşteri cihazı kargoya vermek üzere yönlendirildi.`);
            sendEmailNotification(auth.currentUser.email, "TeknikZeka: Satış Onaylandı & Kargo Kodunuz", `Cihazınızı ${serviceEmail} servisine ${price.toLocaleString('tr-TR')} ₺ karşılığında satmayı kabul ettiniz.\n\nAnlaşmalı Kargo Kodunuz: ${cargoCode}\n\nLütfen cihazınızı güvenli bir şekilde paketleyip kargo şubesine bu kod ile teslim ediniz. Cihaz servise ulaştığında ödemeniz hesabınıza aktarılacaktır.`);
            alert("Teklifi kabul ettiniz! Kargo kodunuz ekranda belirmiştir.");
        } catch (error) { console.error("Hata:", error); }
    }
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
    document.getElementById('rating-service-name').innerText = `${serviceEmail} ile olan deneyiminizi puanlayın.`;
    document.getElementById('rating-comment').value = '';
    document.querySelectorAll('#star-rating span').forEach(s => s.style.color = '#ccc');
    document.getElementById('rating-modal').style.display = 'flex';
};

document.querySelectorAll('#star-rating span').forEach(star => {
    star.addEventListener('click', (e) => {
        selectedRating = parseInt(e.target.getAttribute('data-val'));
        document.querySelectorAll('#star-rating span').forEach(s => {
            if (parseInt(s.getAttribute('data-val')) <= selectedRating) {
                s.style.color = '#F59E0B'; // Gold
            } else {
                s.style.color = '#ccc';
            }
        });
    });
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
        document.getElementById('rating-modal').style.display = 'none';
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
        const q = query(collection(db, "tickets"), where("userEmail", "==", user.email));
        onSnapshot(q, async (querySnapshot) => {
            let generatedHtml = '';

            if (querySnapshot.empty) {
                generatedHtml = '<p style="color: var(--gray-light); text-align:center;">Henüz bir arıza kaydınız bulunmuyor.</p>';
                ticketList.innerHTML = generatedHtml;
                localStorage.setItem('tz_customer_tickets_cache', generatedHtml);
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
                        bidHtml = `
                        <div class="success-box-dynamic" style="display:flex; flex-direction:column; gap:10px;">
                            <span style="display:flex; align-items:center; gap:5px;"><strong>${icons.check} Cihazınız <span style="text-decoration: underline;">${data.assignedService}</span> servisine ${data.acceptedPrice.toLocaleString('tr-TR')} ₺'ye satıldı!</strong></span>
                            ${cargoHtml}
                            <div style="display:flex; gap:10px; margin-top: 10px;">
                                <a href="track.html?id=${ticketId}" style="flex:1; text-align:center; padding:8px 10px; background: linear-gradient(135deg, #10B981, #059669); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; display:flex; align-items:center; justify-content:center; gap:5px;">Süreci Takip Et ${icons.truck}</a>
                                <a href="chat.html?ticketId=${ticketId}" style="flex:1; text-align:center; padding:8px 10px; background: transparent; border: 1px solid #10B981; color: #10B981; text-decoration: none; border-radius: 8px; font-weight: bold; display:flex; align-items:center; justify-content:center; gap:5px;">${icons.chat} Mesajlaş</a>
                            </div>
                        </div>`;
                    } else {
                        bidHtml = `<div class="info-box-dynamic"><strong style="display:flex;align-items:center;gap:5px;">${icons.money} Servislerden Gelen Fiyat Teklifleri:</strong><br>`;
                        const offerKeys = data.offers ? Object.keys(data.offers) : [];
                        if (offerKeys.length > 0) {
                            offerKeys.forEach(srv => {
                                let offerPrice = data.offers[srv];
                                if (typeof offerPrice === 'object') offerPrice = offerPrice.price || 0;

                                let ratingHtml = '';
                                if (serviceRatings[srv]) {
                                    const avg = (serviceRatings[srv].sum / serviceRatings[srv].count).toFixed(1);
                                    ratingHtml = `<span style="font-size:0.8rem; color:#F59E0B; margin-left:5px;">★ ${avg} (${serviceRatings[srv].count})</span>`;
                                } else {
                                    ratingHtml = `<span style="font-size:0.8rem; color:#94A3B8; margin-left:5px;">★ Yeni</span>`;
                                }

                                bidHtml += `
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding:10px; background:rgba(0,0,0,0.1); border-radius:8px;">
                                    <span style="font-size:0.95rem;">${srv} ${ratingHtml}: <strong style="font-size: 1.1rem; color: #10B981;">${Number(offerPrice).toLocaleString('tr-TR')} ₺</strong></span>
                                    <button onclick="window.acceptOffer('${ticketId}', '${srv}', ${offerPrice}, event)" style="background:#10B981; border:none; padding:6px 15px; border-radius:6px; color:white; font-weight:bold; cursor:pointer;">Kabul Et</button>
                                </div>`;
                            });
                        } else { bidHtml += `<span style="font-size:0.85rem; display:flex; align-items:center; gap:5px;">${icons.clock} Henüz fiyat teklifi gelmedi...</span>`; }
                        bidHtml += `</div>`;
                    }
                } else {
                    if (data.assignedService) {
                        bidHtml = `
                        <div class="success-box-dynamic" style="display:flex; flex-direction:column; gap:10px;">
                            <span style="display:flex;align-items:center;gap:5px;"><strong>${icons.check} Cihazınız <span style="text-decoration: underline;">${data.assignedService}</span> isimli servise yönlendirildi.</strong></span>
                            ${cargoHtml}
                            <div style="display:flex; gap:10px; margin-top: 10px;">
                                <a href="track.html?id=${ticketId}" style="flex:1; text-align:center; padding:8px 10px; background: linear-gradient(135deg, var(--primary), #4338ca); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; display:flex;align-items:center;justify-content:center;gap:5px;">Süreci Takip Et ${icons.truck}</a>
                                <a href="chat.html?ticketId=${ticketId}" style="flex:1; text-align:center; padding:8px 10px; background: transparent; border: 1px solid #10B981; color: #10B981; text-decoration: none; border-radius: 8px; font-weight: bold; display:flex;align-items:center;justify-content:center;gap:5px;">${icons.chat} Mesajlaş</a>
                            </div>
                        </div>`;
                    }
                    else if (data.interestedServices && data.interestedServices.length > 0) {
                        bidHtml = `<div class="info-box-dynamic"><strong style="display:flex;align-items:center;gap:5px;">${icons.party} Bu cihazı tamir edebilecek servisler:</strong><br>`;
                        data.interestedServices.forEach(srv => {
                            let ratingHtml = '';
                            if (serviceRatings[srv]) {
                                const avg = (serviceRatings[srv].sum / serviceRatings[srv].count).toFixed(1);
                                ratingHtml = `<span style="font-size:0.8rem; color:#F59E0B; margin-left:5px;">★ ${avg} (${serviceRatings[srv].count})</span>`;
                            } else {
                                ratingHtml = `<span style="font-size:0.8rem; color:#94A3B8; margin-left:5px;">★ Yeni</span>`;
                            }

                            bidHtml += `<button onclick="window.selectService('${ticketId}', '${srv}', event)" style="margin-top:8px; background: #10B981; padding: 5px 10px; width: auto; font-size: 0.85rem; display: block; border:none; border-radius: 6px; color:white; font-weight:bold; cursor:pointer;">${srv} ${ratingHtml} - Bu Servisi Seç</button>`;
                        });
                        bidHtml += `</div>`;
                    }
                }

                let reviewHtml = '';
                if ((data.status === 'Satıldı' || data.status === 'Servise Yönlendirildi') && data.processStep >= 3 && !data.isReviewed) {
                    reviewHtml = `
                    <div style="margin-top: 15px;">
                        <button onclick="window.openReviewModal('${ticketId}', '${data.assignedService}', event)" style="width: 100%; background: var(--primary); padding: 12px; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            Servisi Değerlendir
                        </button>
                    </div>`;
                }

                const statusClass = data.status === 'Bekliyor' ? 'status-bekliyor' : 'status-onaylandi';

                generatedHtml += `
                    <div class="ticket-wrapper">
                        <div class="delete-action-btn" onclick="window.deleteTicket('${ticketId}', event)" title="Kaydı Sil"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></div>
                        <div class="modern-ticket-card" onclick="window.toggleSwipe(event, this)">
                            <div class="modern-ticket-header">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 1.8rem; background: rgba(79, 70, 229, 0.1); border-radius: 12px; padding: 5px; display:inline-flex; align-items:center; justify-content:center;">${icons.phone}</span>
                                    <div>
                                        <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">${deviceInfo}</h4>
                                        <span style="font-size: 0.8rem; color: #94A3B8; display:flex; align-items:center; gap:3px;">${icons.calendar} ${dateStr} | Kayıt ID: #${ticketId.slice(0, 6).toUpperCase()}</span>
                                    </div>
                                </div>
                                <span class="status-pill ${statusClass}">${data.status}</span>
                            </div>
                            <div><p style="color: var(--text-main); font-size: 0.95rem;"><strong>Şikayet Özeti:</strong> ${data.description}</p></div>
                            ${formatAIReport(data.aiReport)}
                            ${bidHtml}
                            ${reviewHtml}
                        </div>
                    </div>
                `;
            });

            ticketList.innerHTML = generatedHtml;
            localStorage.setItem('tz_customer_tickets_cache', generatedHtml);

            let activeCount = myTickets.filter(t => t.assignedService !== "").length;
            const activeBadge = document.getElementById('active-badge');
            if (activeBadge) {
                if (activeCount > 0) { activeBadge.style.display = 'inline-block'; activeBadge.innerText = activeCount; }
                else { activeBadge.style.display = 'none'; }
            }

            window.initSwipeMenu();
        });
    }
});