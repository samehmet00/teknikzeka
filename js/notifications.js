// js/notifications.js
import { db, auth } from './firebase-config.js';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const notiList = document.getElementById('notifications-list');
const markAllReadBtn = document.getElementById('mark-all-read');
const clearAllBtn = document.getElementById('clear-all-btn');

// --- ÖNBELLEK: Önceki Bildirimleri Anında Göster ---
const cachedNotis = JSON.parse(localStorage.getItem('tz_notis_cache'));
if (cachedNotis && cachedNotis.length > 0) {
    renderNotifications(cachedNotis);
} else {
    notiList.innerHTML = '<p style="text-align: center; color: var(--gray-light); padding: 30px; font-weight: bold;">Bildirimler Yükleniyor... ⏳</p>';
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        const q = query(collection(db, "notifications"), where("userEmail", "==", user.email));
        
        onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                notiList.innerHTML = '<p style="text-align: center; color: var(--gray-light); padding: 30px; font-weight: bold;">Henüz hiç bildiriminiz yok. 📭</p>';
                localStorage.removeItem('tz_notis_cache');
                return;
            }

            let notifications = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                notifications.push({ 
                    id: doc.id, 
                    ...data,
                    // Tarihleri string'e çevirerek cache'e uygun hale getiriyoruz
                    timeMs: data.createdAt?.toMillis() || 0,
                    dateStr: data.createdAt ? data.createdAt.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' }) : "Az önce"
                });
            });
            
            notifications.sort((a, b) => b.timeMs - a.timeMs);
            
            // Arka planda Firebase'den gelen yeni veriyi cache'e yaz ve çiz
            localStorage.setItem('tz_notis_cache', JSON.stringify(notifications));
            renderNotifications(notifications);
        });

        if (markAllReadBtn) {
            markAllReadBtn.onclick = async () => {
                const unreadQ = query(collection(db, "notifications"), where("userEmail", "==", user.email), where("read", "==", false));
                const unreadSnap = await getDocs(unreadQ);
                unreadSnap.forEach(async (document) => await updateDoc(doc(db, "notifications", document.id), { read: true }));
            };
        }

        if (clearAllBtn) {
            clearAllBtn.onclick = async () => {
                if(!confirm("DİKKAT! Tüm bildirim geçmişinizi kalıcı olarak silmek istediğinize emin misiniz?")) return;
                clearAllBtn.innerHTML = "⏳ Siliniyor..."; clearAllBtn.style.opacity = "0.5"; clearAllBtn.disabled = true;

                try {
                    const allQ = query(collection(db, "notifications"), where("userEmail", "==", user.email));
                    const allSnap = await getDocs(allQ);
                    allSnap.forEach(async (document) => await deleteDoc(doc(db, "notifications", document.id)));
                } catch (error) {
                    alert("Bir hata oluştu.");
                } finally {
                    clearAllBtn.innerHTML = "🗑️ Tümünü Temizle"; clearAllBtn.style.opacity = "1"; clearAllBtn.disabled = false;
                }
            };
        }

    } else {
        localStorage.removeItem('tz_notis_cache');
        window.location.href = "login.html";
    }
});

function renderNotifications(notifications) {
    notiList.innerHTML = '';
    
    notifications.forEach(noti => {
        let safeMessage = noti.message || "";
        let icon = "💬";
        if(safeMessage.includes("🎉")) icon = "🎉";
        if(safeMessage.includes("₺") || safeMessage.includes("🤝")) icon = "₺";
        if(safeMessage.includes("📦") || safeMessage.includes("kargo")) icon = "📦";

        const div = document.createElement('div');
        div.className = `noti-item ${noti.read ? '' : 'unread'}`;
        
        div.innerHTML = `
            <div class="noti-content">
                <div class="noti-icon">${icon}</div>
                <div>
                    <div class="noti-text">${safeMessage}</div>
                    <div class="noti-time">🕒 ${noti.dateStr}</div>
                </div>
            </div>
        `;
        
        div.onclick = async () => {
            if (!noti.read && noti.id) await updateDoc(doc(db, "notifications", noti.id), { read: true });
            // Link varsa oraya git, yoksa geçmiş kayıtlar sayfasına yönlendir
            window.location.href = noti.link || 'tickets.html';
        };
        notiList.appendChild(div);
    });
}