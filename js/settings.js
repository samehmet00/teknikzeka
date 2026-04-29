// js/settings.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- ELEMENTLER ---
const notifSystem = document.getElementById('notif-system');
const notifEmail = document.getElementById('notif-email');
const notifMsg = document.getElementById('notif-msg');

const oldPasswordInput = document.getElementById('old-password');
const newPasswordInput = document.getElementById('new-password');
const updatePassBtn = document.getElementById('update-pass-btn');
const passMsg = document.getElementById('pass-msg');

const deleteAccountBtn = document.getElementById('delete-account-btn');

let currentUser = null;

// --- KULLANICI KONTROLÜ VE BİLDİRİM VERİSİNİ ÇEKME ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Firestore'dan mevcut bildirim ayarlarını çek
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            // Veritabanında daha önce kaydedilmiş bir ayar varsa onu kullan, yoksa HTML'deki default (true) kalsın
            if (data.notifSystem !== undefined) notifSystem.checked = data.notifSystem;
            if (data.notifEmail !== undefined) notifEmail.checked = data.notifEmail;
        }
    } else {
        window.location.href = "login.html"; // Giriş yapmamışsa at
    }
});

// --- BİLDİRİM AYARLARINI KAYDETME (Şaltere basıldıkça tetiklenir) ---
const saveNotificationSettings = async () => {
    if (!currentUser) return;
    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            notifSystem: notifSystem.checked,
            notifEmail: notifEmail.checked
        });
        showMsg(notifMsg, "Ayarlar başarıyla kaydedildi.", "success");
        setTimeout(() => notifMsg.style.display = 'none', 3000);
    } catch (error) {
        console.error(error);
        showMsg(notifMsg, "Ayarlar kaydedilirken hata oluştu.", "error");
    }
};

notifSystem.addEventListener('change', saveNotificationSettings);
notifEmail.addEventListener('change', saveNotificationSettings);


// --- ŞİFRE GÜNCELLEME ---
updatePassBtn.addEventListener('click', async () => {
    const oldPass = oldPasswordInput.value;
    const newPass = newPasswordInput.value;

    if (!oldPass || !newPass) {
        return showMsg(passMsg, "Lütfen mevcut ve yeni şifrenizi girin.", "error");
    }
    if (newPass.length < 6) {
        return showMsg(passMsg, "Yeni şifreniz en az 6 karakter olmalıdır.", "error");
    }

    updatePassBtn.innerText = "Güncelleniyor...";
    updatePassBtn.disabled = true;

    try {
        // Firebase Güvenliği: Şifre değiştirmek için kullanıcının yeniden doğrulanması gerekir
        const credential = EmailAuthProvider.credential(currentUser.email, oldPass);
        await reauthenticateWithCredential(currentUser, credential);
        
        // Doğrulama başarılı, şifreyi güncelle
        await updatePassword(currentUser, newPass);
        
        showMsg(passMsg, "Şifreniz başarıyla güncellendi!", "success");
        oldPasswordInput.value = "";
        newPasswordInput.value = "";
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/invalid-credential') {
            showMsg(passMsg, "Mevcut şifrenizi yanlış girdiniz.", "error");
        } else {
            showMsg(passMsg, "Şifre güncellenemedi. Lütfen tekrar giriş yapıp deneyin.", "error");
        }
    } finally {
        updatePassBtn.innerText = "Şifreyi Güncelle";
        updatePassBtn.disabled = false;
    }
});


// --- HESAP SİLME ---
deleteAccountBtn.addEventListener('click', async () => {
    const confirmDelete = confirm("DİKKAT! Hesabınızı silmek istediğinize emin misiniz? Tüm geçmiş verileriniz kalıcı olarak silinecektir.");
    if (!confirmDelete) return;

    // Şifre sormadan önce Firebase güvenlik kuralları gereği, 
    // kullanıcı yakın zamanda giriş yapmadıysa hata verir.
    // Bunu engellemek için uyarı bırakıyoruz.
    try {
        // İsteğe bağlı: Veritabanındaki user dökümanını da silmek
        await deleteDoc(doc(db, "users", currentUser.uid));
        
        // Auth (Kayıt) silme
        await deleteUser(currentUser);
        
        alert("Hesabınız başarıyla silindi. Hoşça kalın!");
        window.location.href = "../index.html";
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/requires-recent-login') {
            alert("Güvenlik nedeniyle hesabı silebilmek için sisteme yeni giriş yapmış olmanız gerekir. Lütfen çıkış yapıp tekrar girdikten sonra deneyin.");
        } else {
            alert("Hesap silinirken bir hata oluştu.");
        }
    }
});

// Yardımcı Mesaj Fonksiyonu
function showMsg(element, text, type) {
    element.innerText = text;
    element.className = `msg-box msg-${type}`;
    element.style.display = 'block';
}