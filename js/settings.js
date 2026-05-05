// js/settings.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const notifSystem = document.getElementById('notif-system');
const notifEmail = document.getElementById('notif-email');
const notifMsg = document.getElementById('notif-msg');
const oldPasswordInput = document.getElementById('old-password');
const newPasswordInput = document.getElementById('new-password');
const updatePassBtn = document.getElementById('update-pass-btn');
const passMsg = document.getElementById('pass-msg');
const deleteAccountBtn = document.getElementById('delete-account-btn');

let currentUser = null;

// --- ÖNBELLEK: Switchleri (Aç/Kapa Butonları) Anında Yükle ---
const cachedSettings = JSON.parse(localStorage.getItem('tz_settings_cache'));
if (cachedSettings) {
    if(notifSystem) notifSystem.checked = cachedSettings.notifSystem;
    if(notifEmail) notifEmail.checked = cachedSettings.notifEmail;
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            // Varsayılan olarak true (hepsi açık)
            notifSystem.checked = data.notifSystem !== false;
            notifEmail.checked = data.notifEmail !== false;
            
            // Arka planda Firebase'den gelen kesin veriyi cache'e yaz
            localStorage.setItem('tz_settings_cache', JSON.stringify({ notifSystem: notifSystem.checked, notifEmail: notifEmail.checked }));
        }
    } else {
        localStorage.removeItem('tz_settings_cache');
        window.location.href = "login.html"; 
    }
});

const saveNotificationSettings = async () => {
    if (!currentUser) return;
    try {
        await updateDoc(doc(db, "users", currentUser.uid), { notifSystem: notifSystem.checked, notifEmail: notifEmail.checked });
        localStorage.setItem('tz_settings_cache', JSON.stringify({ notifSystem: notifSystem.checked, notifEmail: notifEmail.checked }));
        showMsg(notifMsg, "Ayarlar başarıyla kaydedildi.", "success");
        setTimeout(() => notifMsg.style.display = 'none', 3000);
    } catch (error) { showMsg(notifMsg, "Hata oluştu.", "error"); }
};

if(notifSystem) notifSystem.addEventListener('change', saveNotificationSettings);
if(notifEmail) notifEmail.addEventListener('change', saveNotificationSettings);

if(updatePassBtn) {
    updatePassBtn.addEventListener('click', async () => {
        const oldPass = oldPasswordInput.value; const newPass = newPasswordInput.value;
        if (!oldPass || !newPass) return showMsg(passMsg, "Lütfen mevcut ve yeni şifrenizi girin.", "error");
        if (newPass.length < 6) return showMsg(passMsg, "Yeni şifreniz en az 6 karakter olmalıdır.", "error");

        updatePassBtn.innerText = "Güncelleniyor..."; updatePassBtn.disabled = true;

        try {
            const credential = EmailAuthProvider.credential(currentUser.email, oldPass);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPass);
            showMsg(passMsg, "Şifreniz başarıyla güncellendi!", "success");
            oldPasswordInput.value = ""; newPasswordInput.value = "";
        } catch (error) {
            if (error.code === 'auth/invalid-credential') showMsg(passMsg, "Mevcut şifrenizi yanlış girdiniz.", "error");
            else showMsg(passMsg, "Şifre güncellenemedi. Çıkış yapıp tekrar deneyin.", "error");
        } finally { updatePassBtn.innerText = "Şifreyi Güncelle"; updatePassBtn.disabled = false; }
    });
}

if(deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async () => {
        if (!confirm("DİKKAT! Hesabınızı silmek istediğinize emin misiniz?")) return;
        try {
            await deleteDoc(doc(db, "users", currentUser.uid));
            await deleteUser(currentUser);
            localStorage.clear(); // Silinen kullanıcının tüm kalıntılarını temizle
            alert("Hesabınız başarıyla silindi. Hoşça kalın!");
            window.location.href = "../index.html";
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') alert("Güvenlik nedeniyle hesabı silebilmek için sisteme yeni giriş yapmış olmanız gerekir.");
            else alert("Hesap silinirken bir hata oluştu.");
        }
    });
}

function showMsg(element, text, type) { element.innerText = text; element.className = `msg-box msg-${type}`; element.style.display = 'block'; }