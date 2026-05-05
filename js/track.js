// js/track.js
import { db, auth } from './firebase-config.js';
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const urlParams = new URLSearchParams(window.location.search);
const ticketId = urlParams.get('id');

const deviceTitle = document.getElementById('device-title');
const ticketIdDisplay = document.getElementById('ticket-id-display');
const statusBadge = document.getElementById('status-badge');
const timelineContainer = document.getElementById('timeline-container');
const cargoDisplayBox = document.getElementById('cargo-display-box');
const cargoCodeText = document.getElementById('cargo-code-text');
const serviceControls = document.getElementById('service-controls');
const cargoInput = document.getElementById('cargo-input');
const serviceRatingBox = document.getElementById('service-rating-box');

let currentTicket = null;
let currentUserEmail = "";
let serviceRatings = {};

if (!ticketId) {
    alert("Geçersiz takip numarası!");
    window.location.href = "dashboard.html";
}

// --- ÖNBELLEK ---
const cachedTicket = JSON.parse(localStorage.getItem(`tz_track_${ticketId}`));
if (cachedTicket) {
    currentTicket = cachedTicket;
    currentUserEmail = localStorage.getItem('tz_track_email') || "";
    renderUI();
}

// Servis puan ortalamalarını çek
async function fetchServiceRatings() {
    try {
        const reviewsSnap = await getDocs(collection(db, "reviews"));
        reviewsSnap.forEach(r => {
            const rData = r.data();
            if (!serviceRatings[rData.serviceEmail]) serviceRatings[rData.serviceEmail] = { sum: 0, count: 0 };
            serviceRatings[rData.serviceEmail].sum += rData.rating;
            serviceRatings[rData.serviceEmail].count += 1;
        });
    } catch(e) { console.error("Rating fetch error:", e); }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserEmail = user.email;
        localStorage.setItem('tz_track_email', user.email);
        await fetchServiceRatings();
        startTracking();
    } else {
        window.location.href = "login.html";
    }
});

function startTracking() {
    const docRef = doc(db, "tickets", ticketId);
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            currentTicket = { id: docSnap.id, ...docSnap.data() };
            localStorage.setItem(`tz_track_${ticketId}`, JSON.stringify(currentTicket));
            renderUI();
        } else {
            if (!cachedTicket) alert("Böyle bir kayıt bulunamadı.");
        }
    });
}

function getSteps(isForSale) {
    if (isForSale) {
        return [
            { title: "Kargo Bekleniyor",        desc: "Cihazın servise kargo ile gönderilmesi bekleniyor." },
            { title: "Cihaz Teslim Alındı",     desc: "Servis cihazı teslim aldı ve inceleme başladı." },
            { title: "Ödeme İşleme Alındı",     desc: "Anlaşılan tutar ödeme için işleme alındı." },
            { title: "Süreç Tamamlandı",        desc: "Ödeme müşteri hesabına aktarıldı. İşlem tamamlandı." }
        ];
    } else {
        return [
            { title: "Kargo Bekleniyor",                   desc: "Cihazın servise kargo ile gönderilmesi bekleniyor." },
            { title: "Cihaz Teslim Alındı",                desc: "Servis cihazı teslim aldı ve arıza tespitine başladı." },
            { title: "Onarım Aşamasında",                  desc: "Teknisyen cihaz üzerinde çalışıyor." },
            { title: "Onarım Tamamlandı ve Kargolandı",    desc: "Cihaz tamir edildi, müşteriye kargo ile gönderildi." }
        ];
    }
}

function renderUI() {
    if (!currentTicket) return;

    const deviceLabel = currentTicket.deviceBrand
        ? `${currentTicket.deviceBrand} ${currentTicket.deviceModel}`
        : (currentTicket.deviceType || "Cihaz");

    deviceTitle.innerText = deviceLabel;
    ticketIdDisplay.innerText = `Kayıt ID: #${ticketId.slice(0, 8).toUpperCase()}`;

    const isForSale = currentTicket.isForSale;
    statusBadge.innerText = isForSale ? "Satış İşlemi" : "Tamir İşlemi";
    statusBadge.style.backgroundColor = isForSale ? "#10B981" : "var(--primary)";

    // Kargo kodu göster
    if (currentTicket.cargoCode) {
        cargoDisplayBox.style.display = "flex";
        cargoCodeText.innerText = currentTicket.cargoCode;
        if (cargoInput) cargoInput.value = currentTicket.cargoCode;
    }

    // Servis puan kutusunu göster (müşteri için)
    if (serviceRatingBox && currentTicket.assignedService) {
        const svc = currentTicket.assignedService;
        const ratingData = serviceRatings[svc];
        if (ratingData && ratingData.count > 0) {
            const avg = (ratingData.sum / ratingData.count).toFixed(1);
            serviceRatingBox.style.display = "flex";
            serviceRatingBox.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                        <strong style="color:var(--text-main);">${svc}</strong>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; background:rgba(245,158,11,0.1); padding:4px 12px; border-radius:20px; border:1px solid rgba(245,158,11,0.3);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        <span style="font-weight:700; color:#F59E0B; font-size:1.1rem;">${avg}</span>
                        <span style="color:var(--gray-light); font-size:0.85rem;">(${ratingData.count} değerlendirme)</span>
                    </div>
                </div>
            `;
        } else {
            serviceRatingBox.style.display = "flex";
            serviceRatingBox.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                    <strong style="color:var(--text-main);">${svc}</strong>
                    <span style="color:var(--gray-light); font-size:0.85rem;">— Henüz değerlendirme yok</span>
                </div>
            `;
        }
    }

    // Adımları oluştur
    const steps = getSteps(isForSale);
    let currentStepIndex = currentTicket.processStep || 0;
    const totalSteps = steps.length;
    const isLastStep = currentStepIndex >= totalSteps - 1;

    timelineContainer.innerHTML = '';
    steps.forEach((step, index) => {
        let statusClass = "";
        let dateText = "";
        if (index < currentStepIndex) {
            statusClass = "completed";
            dateText = "Tamamlandi";
        } else if (index === currentStepIndex) {
            statusClass = "active";
            dateText = "Mevcut aşama";
        } else {
            dateText = "Bekleniyor";
        }

        const iconSvg = index < currentStepIndex
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
            : '';

        timelineContainer.innerHTML += `
            <div class="step ${statusClass}">
                <div class="step-node">${iconSvg}</div>
                <div class="step-content">
                    <h4>${step.title}</h4>
                    <p>${index === currentStepIndex ? step.desc : dateText}</p>
                </div>
            </div>`;
    });

    // --- SERVİS KONTROL PANELİ ---
    const isServiceOwner = currentUserEmail === currentTicket.assignedService;
    if (isServiceOwner && serviceControls) {
        serviceControls.style.display = "block";

        const advanceBtn = document.getElementById('advance-step-btn');
        const completedBtn = document.getElementById('process-complete-btn');

        if (isLastStep) {
            // Son aşamaya ulaşıldı: "İleri" butonunu gizle, "Süreç Tamamlandı"'yı göster
            if (advanceBtn) advanceBtn.style.display = "none";
            if (completedBtn) {
                completedBtn.style.display = "flex";
                // Eğer zaten tamamlandıysa disabled, değilse aktif
                if (currentTicket.processCompleted) {
                    completedBtn.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Süreç Zaten Tamamlandı
                    `;
                    completedBtn.disabled = true;
                    completedBtn.style.opacity = "0.6";
                    completedBtn.style.cursor = "not-allowed";
                } else {
                    completedBtn.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Sureci Tamamla ve Müşteriyi Bilgilendir
                    `;
                    completedBtn.disabled = false;
                    completedBtn.onclick = async () => {
                        completedBtn.disabled = true;
                        completedBtn.innerText = "Tamamlanıyor...";
                        try {
                            await updateDoc(doc(db, "tickets", ticketId), { processCompleted: true });
                            await addDoc(collection(db, "notifications"), {
                                userEmail: currentTicket.userEmail,
                                message: isForSale
                                    ? `Cihazınızın satış süreci tamamlandı. Ödemeniz işleme alındı.`
                                    : `Cihazınız tamir edildi ve kargoya verildi! Takip kodunuz: ${currentTicket.cargoCode || 'Bildirildi'}`,
                                link: `track.html?id=${ticketId}`,
                                read: false,
                                createdAt: serverTimestamp()
                            });
                        } catch(e) {
                            console.error(e);
                            alert("Hata oluştu.");
                            completedBtn.disabled = false;
                        }
                    };
                }
            }
        } else {
            // Henüz son aşamada değil: "İleri" butonu aktif
            if (advanceBtn) {
                advanceBtn.style.display = "flex";
                const nextStep = steps[currentStepIndex + 1];
                advanceBtn.innerHTML = `
                    Sonraki Aşama: ${nextStep.title}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                `;
                advanceBtn.disabled = false;
                advanceBtn.style.opacity = "1";
                advanceBtn.onclick = async () => {
                    advanceBtn.disabled = true;
                    try {
                        await updateDoc(doc(db, "tickets", ticketId), { processStep: currentStepIndex + 1 });
                        // Müşteriyi bilgilendir
                        await addDoc(collection(db, "notifications"), {
                            userEmail: currentTicket.userEmail,
                            message: `Cihazınızın durumu güncellendi: "${nextStep.title}" aşamasına geçildi.`,
                            link: `track.html?id=${ticketId}`,
                            read: false,
                            createdAt: serverTimestamp()
                        });
                    } catch(e) {
                        console.error(e);
                        advanceBtn.disabled = false;
                    }
                };
            }
            if (completedBtn) completedBtn.style.display = "none";
        }

        const saveCargoBtn = document.getElementById('save-cargo-btn');
        if (saveCargoBtn) {
            saveCargoBtn.onclick = async () => {
                const code = cargoInput ? cargoInput.value.trim() : "";
                if (code) {
                    await updateDoc(doc(db, "tickets", ticketId), { cargoCode: code });
                    alert("Kargo kodu eklendi!");
                }
            };
        }
    } else if (serviceControls) {
        serviceControls.style.display = "none";
    }

    // --- MÜŞTERİ İÇİN: İşlem tamamlandı mesajı ---
    const completionMsg = document.getElementById('customer-completion-msg');
    if (completionMsg) {
        if (currentTicket.processCompleted && currentUserEmail === currentTicket.userEmail) {
            completionMsg.style.display = "block";
            completionMsg.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="background:#10B981; border-radius:50%; width:42px; height:42px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div>
                        <strong style="color:#10B981; font-size:1.05rem;">Süreç Tamamlandı!</strong>
                        <p style="margin:2px 0 0; color:var(--gray-light); font-size:0.9rem;">
                            ${isForSale ? 'Satış işleminiz tamamlandı. Ödemeniz hesabınıza aktarıldı.' : 'Cihazınız tamir edildi ve kargoya verildi.'}
                        </p>
                    </div>
                </div>
            `;
        } else {
            completionMsg.style.display = "none";
        }
    }
}