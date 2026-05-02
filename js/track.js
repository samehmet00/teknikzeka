// js/track.js
import { db, auth } from './firebase-config.js';
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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

let currentTicket = null;
let currentUserEmail = "";

if (!ticketId) {
    alert("Geçersiz takip numarası!");
    window.location.href = "dashboard.html";
}

// --- ÖNBELLEK: Yüklenme ekranını atla ---
const cachedTicket = JSON.parse(localStorage.getItem(`tz_track_${ticketId}`));
if (cachedTicket) {
    currentTicket = cachedTicket;
    currentUserEmail = localStorage.getItem('tz_track_email') || "";
    renderUI();
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserEmail = user.email;
        localStorage.setItem('tz_track_email', user.email);
        startTracking();
    } else {
        window.location.href = "login.html";
    }
});

function startTracking() {
    const docRef = doc(db, "tickets", ticketId);
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            currentTicket = docSnap.data();
            localStorage.setItem(`tz_track_${ticketId}`, JSON.stringify(currentTicket));
            renderUI();
        } else {
            if(!cachedTicket) alert("Böyle bir kayıt bulunamadı.");
        }
    });
}

function renderUI() {
    deviceTitle.innerText = `${currentTicket.deviceBrand} ${currentTicket.deviceModel}`;
    ticketIdDisplay.innerText = `Kayıt ID: #${ticketId.slice(0,8).toUpperCase()}`;
    statusBadge.innerText = currentTicket.isForSale ? "Satış İşlemi" : "Tamir İşlemi";
    statusBadge.style.backgroundColor = currentTicket.isForSale ? "#10B981" : "var(--primary)";

    if (currentTicket.cargoCode) {
        cargoDisplayBox.style.display = "flex";
        cargoCodeText.innerText = currentTicket.cargoCode;
        if(cargoInput) cargoInput.value = currentTicket.cargoCode;
    }

    let steps = currentTicket.isForSale 
        ? ["Kargo Bekleniyor", "Cihaz Teslim Alındı & İnceleniyor", "Ödeme Müşteriye Aktarıldı", "İşlem Tamamlandı"] 
        : ["Kargo Bekleniyor", "Cihaz Teslim Alındı", "Onarım Aşamasında", "Onarım Bitti & Kargolandı"];

    let currentStepIndex = currentTicket.processStep || 0;

    timelineContainer.innerHTML = '';
    steps.forEach((stepText, index) => {
        let statusClass = ""; let desc = "";
        if (index < currentStepIndex) { statusClass = "completed"; desc = "Aşama tamamlandı."; } 
        else if (index === currentStepIndex) { statusClass = "active"; desc = "Şu an bu aşamada..."; } 
        else { desc = "Bekliyor..."; }

        timelineContainer.innerHTML += `
            <div class="step ${statusClass}">
                <div class="step-content"><h4>${stepText}</h4><p>${desc}</p></div>
            </div>`;
    });

    if (currentUserEmail === currentTicket.assignedService && serviceControls) {
        serviceControls.style.display = "block";
        const advanceBtn = document.getElementById('advance-step-btn');
        
        if (currentStepIndex >= steps.length - 1) {
            advanceBtn.innerText = "Süreç Tamamlandı 🎉"; advanceBtn.disabled = true; advanceBtn.style.opacity = "0.5";
        } else {
            advanceBtn.innerText = `Sonraki Aşama: ${steps[currentStepIndex + 1]} 🚀`;
            advanceBtn.onclick = async () => await updateDoc(doc(db, "tickets", ticketId), { processStep: currentStepIndex + 1 });
        }

        const saveCargoBtn = document.getElementById('save-cargo-btn');
        if(saveCargoBtn) {
            saveCargoBtn.onclick = async () => {
                const code = cargoInput.value.trim();
                if (code) { await updateDoc(doc(db, "tickets", ticketId), { cargoCode: code }); alert("Kargo kodu eklendi!"); }
            };
        }
    }
}