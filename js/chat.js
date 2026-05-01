// js/chat.js
import { db, auth } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const chatMessagesBox = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const msgInput = document.getElementById('msg-input');
const partnerNameEl = document.getElementById('chat-partner-name');
const ticketInfoEl = document.getElementById('chat-ticket-info');
const avatarLetterEl = document.getElementById('chat-avatar-letter');

// URL'den Arıza/İhale ID'sini al (Örn: chat.html?ticketId=xyz123)
const urlParams = new URLSearchParams(window.location.search);
const ticketId = urlParams.get('ticketId');

let currentUser = null;
let currentTicket = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        if (!ticketId) {
            alert("Geçersiz işlem. Cihaz ID bulunamadı.");
            window.history.back();
            return;
        }

        // Cihaz (Ticket) Bilgilerini Çek
        const ticketRef = doc(db, "tickets", ticketId);
        const ticketSnap = await getDoc(ticketRef);
        
        if (ticketSnap.exists()) {
            currentTicket = ticketSnap.data();
            
            // Eğer ben Müşteriysem karşımdaki Servistir.
            // Eğer ben Servissem karşımdaki Müşteridir.
            const isCustomer = currentUser.email === currentTicket.userEmail;
            const partnerEmail = isCustomer ? currentTicket.assignedService : currentTicket.userEmail;
            
            // Üst Bilgileri Doldur
            partnerNameEl.innerText = partnerEmail.split('@')[0]; // İsim olarak mailin ilk kısmını al
            avatarLetterEl.innerText = partnerEmail.charAt(0).toUpperCase();
            ticketInfoEl.innerText = `${currentTicket.deviceBrand} ${currentTicket.deviceModel} İşlemi`;

            // Gerçek Zamanlı Mesaj Dinleyici (Realtime)
            listenForMessages();
        } else {
            alert("Cihaz kaydı bulunamadı.");
        }
    } else {
        window.location.href = "login.html";
    }
});

function listenForMessages() {
    // Sadece bu ticketId'ye ait mesajları, tarihe göre sıralı çek
    const q = query(
        collection(db, "messages"), 
        where("ticketId", "==", ticketId),
        orderBy("createdAt", "asc") // Eskiden yeniye sırala
    );

    onSnapshot(q, (snapshot) => {
        chatMessagesBox.innerHTML = ''; // Temizle
        
        if (snapshot.empty) {
            chatMessagesBox.innerHTML = '<div style="text-align:center; color:var(--gray-light); margin-top:20px; font-size:0.9rem;">Mesajlaşma başlatıldı. İlk mesajı siz gönderin! 👋</div>';
            return;
        }

        snapshot.forEach((doc) => {
            const msgData = doc.data();
            // Mesaj benden mi başkasından mı?
            const isMe = msgData.senderEmail === currentUser.email;
            
            let timeStr = "";
            if (msgData.createdAt) {
                const date = msgData.createdAt.toDate();
                timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            }

            const div = document.createElement('div');
            div.className = `msg-bubble ${isMe ? 'msg-me' : 'msg-other'}`;
            div.innerHTML = `
                ${msgData.text}
                <span class="msg-time">${timeStr}</span>
            `;
            chatMessagesBox.appendChild(div);
        });

        // Yeni mesaj gelince otomatik en alta kaydır
        chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
    });
}

// Mesaj Gönderme
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text || !currentUser || !currentTicket) return;

    msgInput.value = ''; // Kutuyu hemen boşalt
    msgInput.focus();

    try {
        await addDoc(collection(db, "messages"), {
            ticketId: ticketId,
            senderEmail: currentUser.email,
            text: text,
            createdAt: serverTimestamp()
        });
        
        // Karşı Tarafa Firebase Bildirimi de Gönderelim! (Zile düşsün)
        const isCustomer = currentUser.email === currentTicket.userEmail;
        const receiverEmail = isCustomer ? currentTicket.assignedService : currentTicket.userEmail;
        
        await addDoc(collection(db, "notifications"), { 
            userEmail: receiverEmail, 
            message: `💬 Yeni bir mesajınız var: "${text.substring(0, 20)}..."`, 
            link: `chat.html?ticketId=${ticketId}`, 
            read: false, 
            createdAt: serverTimestamp() 
        });

    } catch (error) {
        console.error("Mesaj gönderilirken hata:", error);
        alert("Mesaj gönderilemedi, lütfen internetinizi kontrol edin.");
    }
});