// js/notifications.js
import { db, auth } from './firebase-config.js';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const listContainer = document.getElementById('notifications-list');
let currentDocs = [];

// Tema
const themeBtn = document.getElementById('theme-toggle-btn');
if (localStorage.getItem('theme') === 'light') { document.body.classList.add('light-mode'); themeBtn.innerText = '🌙'; }
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    if (document.body.classList.contains('light-mode')) { themeBtn.innerText = '🌙'; localStorage.setItem('theme', 'light'); } 
    else { themeBtn.innerText = '☀️'; localStorage.setItem('theme', 'dark'); }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        const q = query(collection(db, "notifications"), where("userEmail", "==", user.email));
        onSnapshot(q, (snapshot) => {
            currentDocs = [];
            listContainer.innerHTML = '';
            if (snapshot.empty) {
                listContainer.innerHTML = '<p style="text-align: center; color: var(--gray-light); padding: 20px;">Hiç bildiriminiz yok.</p>';
                return;
            }

            let notis = [];
            snapshot.forEach(doc => { notis.push({ id: doc.id, ...doc.data() }); currentDocs.push(doc.id); });
            
            // Tarihe göre sırala (En yeni en üstte)
            notis.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

            notis.forEach(noti => {
                let dateStr = "Az önce";
                if(noti.createdAt) {
                    const d = noti.createdAt.toDate();
                    dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });
                }

                const item = document.createElement('div');
                item.className = `noti-item ${noti.read ? '' : 'unread'}`;
                item.innerHTML = `
                    <div>
                        <div class="noti-text">${noti.message}</div>
                        <div class="noti-time">🕒 ${dateStr}</div>
                    </div>
                    <div>${noti.read ? '👁️' : '<span style="color:#10B981; font-weight:bold;">Yeni</span>'}</div>
                `;
                item.onclick = async () => {
                    if (!noti.read) await updateDoc(doc(db, "notifications", noti.id), { read: true });
                    window.location.href = noti.link;
                };
                listContainer.appendChild(item);
            });
        });
    } else { window.location.href = "login.html"; }
});

document.getElementById('mark-all-read').addEventListener('click', async () => {
    if (currentDocs.length === 0) return;
    const batch = writeBatch(db);
    currentDocs.forEach(id => {
        batch.update(doc(db, "notifications", id), { read: true });
    });
    await batch.commit();
});