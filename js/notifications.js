// js/notifications.js
import { db, auth } from './firebase-config.js';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const notiList = document.getElementById('notifications-list');
const markAllReadBtn = document.getElementById('mark-all-read');
const clearAllBtn = document.getElementById('clear-all-btn');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Kullanıcıya ait bildirimleri çek
        const q = query(collection(db, "notifications"), where("userEmail", "==", user.email));
        
        onSnapshot(q, (snapshot) => {
            notiList.innerHTML = '';
            if (snapshot.empty) {
                notiList.innerHTML = '<p style="text-align: center; color: var(--gray-light); padding: 30px; font-weight: bold;">Henüz hiç bildiriminiz yok. 📭</p>';
                return;
            }

            let notifications = [];
            snapshot.forEach(doc => notifications.push({ id: doc.id, ...doc.data() }));
            
            // Tarihe göre yeniden eskiye sırala
            notifications.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

            notifications.forEach(noti => {
                let dateStr = "Az önce";
                if(noti.createdAt) {
                    const d = noti.createdAt.toDate();
                    dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' });
                }


                // Bildirim ikonunu mesajın içeriğine göre dinamik yapalım
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
                            <div class="noti-time">🕒 ${dateStr}</div>
                        </div>
                    </div>
                `;
                
                // Tıklayınca okundu yap ve linke git
                div.onclick = async () => {
                    if (!noti.read) {
                        await updateDoc(doc(db, "notifications", noti.id), { read: true });
                    }
                    if (noti.link) window.location.href = noti.link;
                };
                
                notiList.appendChild(div);
            });
        });

        // --- TÜMÜNÜ OKUNDU İŞARETLE ---
        if (markAllReadBtn) {
            markAllReadBtn.onclick = async () => {
                const unreadQ = query(collection(db, "notifications"), where("userEmail", "==", user.email), where("read", "==", false));
                const unreadSnap = await getDocs(unreadQ);
                unreadSnap.forEach(async (document) => {
                    await updateDoc(doc(db, "notifications", document.id), { read: true });
                });
            };
        }

        // --- TÜMÜNÜ TEMİZLE ---
        if (clearAllBtn) {
            clearAllBtn.onclick = async () => {
                if(!confirm("DİKKAT! Tüm bildirim geçmişinizi kalıcı olarak silmek istediğinize emin misiniz?")) return;
                
                // Butonu deaktif et ve yazısını değiştir (Yükleniyor efekti)
                clearAllBtn.innerHTML = "⏳ Siliniyor...";
                clearAllBtn.style.opacity = "0.5";
                clearAllBtn.disabled = true;

                try {
                    const allQ = query(collection(db, "notifications"), where("userEmail", "==", user.email));
                    const allSnap = await getDocs(allQ);
                    
                    // Firebase'deki tüm dökümanları tek tek sil
                    allSnap.forEach(async (document) => {
                        await deleteDoc(doc(db, "notifications", document.id));
                    });
                    
                } catch (error) {
                    console.error("Bildirimler silinirken hata:", error);
                    alert("Bir hata oluştu, lütfen sayfayı yenileyip tekrar deneyin.");
                } finally {
                    clearAllBtn.innerHTML = "🗑️ Tümünü Temizle";
                    clearAllBtn.style.opacity = "1";
                    clearAllBtn.disabled = false;
                }
            };
        }

    } else {
        window.location.href = "login.html";
    }
});