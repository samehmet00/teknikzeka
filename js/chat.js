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

        loadTicketInfo(); 
    } else {
        window.location.href = "login.html";
    }
});

async function loadTicketInfo() {
    try {
        const ticketRef = doc(db, "tickets", ticketId);
        const ticketSnap = await getDoc(ticketRef);
        
        if (ticketSnap.exists()) {
            currentTicket = ticketSnap.data();
            
            const isCustomer = currentUser.email === currentTicket.userEmail;
            const partnerEmail = isCustomer ? currentTicket.assignedService : currentTicket.userEmail;
            
            const partnerName = partnerEmail.split('@')[0];
            const avatarL = partnerEmail.charAt(0).toUpperCase();
            const tInfo = `${currentTicket.deviceBrand} ${currentTicket.deviceModel} İşlemi`;

            partnerNameEl.innerText = partnerName;
            avatarLetterEl.innerText = avatarL;
            ticketInfoEl.innerText = tInfo;

            // Header bilgisini hafızaya al ki bir dahaki girişte anında çıksın
            localStorage.setItem(`tz_chat_partner_${ticketId}`, partnerName);
            localStorage.setItem(`tz_chat_info_${ticketId}`, tInfo);
            localStorage.setItem(`tz_chat_avatar_${ticketId}`, avatarL);

            listenForMessages();
        }
    } catch (e) {
        console.log("Bağlantı hatası:", e);
    }
}

function listenForMessages() {
    const q = query(
        collection(db, "messages"), 
        where("ticketId", "==", ticketId),
        orderBy("createdAt", "asc")
    );

    onSnapshot(q, (snapshot) => {
        chatMessagesBox.innerHTML = ''; 
        
        if (snapshot.empty) {
            chatMessagesBox.innerHTML = '<div style="text-align:center; color:var(--gray-light); margin-top:20px; font-size:0.9rem;">Mesajlaşma başlatıldı. İlk mesajı siz gönderin! 👋</div>';
            return;
        }

        let allHtml = "";

        snapshot.forEach((doc) => {
            const msgData = doc.data();
            const isMe = msgData.senderEmail === currentUser.email;
            
            let timeStr = "";
            if (msgData.createdAt) {
                const date = msgData.createdAt.toDate();
                timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            }

            allHtml += `
                <div class="msg-bubble ${isMe ? 'msg-me' : 'msg-other'}">
                    ${msgData.text}
                    <span class="msg-time">${timeStr}</span>
                </div>
            `;
        });

        chatMessagesBox.innerHTML = allHtml;
        chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
        
        // Mesaj geçmişini hafızaya al (Cache)
        localStorage.setItem(`tz_chat_msgs_${ticketId}`, allHtml);
    });
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text || !currentUser || !currentTicket) return;

    msgInput.value = ''; 
    msgInput.focus();

    try {
        await addDoc(collection(db, "messages"), { ticketId: ticketId, senderEmail: currentUser.email, text: text, createdAt: serverTimestamp() });
        
        const isCustomer = currentUser.email === currentTicket.userEmail;
        const receiverEmail = isCustomer ? currentTicket.assignedService : currentTicket.userEmail;
        
        await addDoc(collection(db, "notifications"), { 
            userEmail: receiverEmail, 
            message: `💬 Yeni mesaj: "${text.substring(0, 20)}..."`, 
            link: `chat.html?ticketId=${ticketId}`, 
            read: false, 
            createdAt: serverTimestamp() 
        });
    } catch (error) {
        alert("Mesaj gönderilemedi, lütfen internetinizi kontrol edin.");
    }
});