// js/auth.js

import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// --- HTML ELEMENTLERİ ---
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const authTitle = document.getElementById('auth-title');
const toggleText = document.getElementById('toggle-text');
const authError = document.getElementById('auth-error');

const authContainer = document.getElementById('auth-container');
const dashboardSection = document.getElementById('dashboard-section');

// --- AYARLAR ---
let isLoginMode = true;
// Buraya teknik servis yetkisi vermek istediğiniz e-postaları ekleyin
const techServiceEmails = ["servis@teknikzeka.app", "admin@test.com"]; 

// --- GİRİŞ / KAYIT MODU DEĞİŞTİRME ---
toggleText.addEventListener('click', (e) => {
    if(e.target.tagName === 'A') {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        
        authTitle.innerText = isLoginMode ? "Giriş Yap" : "Kayıt Ol";
        authBtn.innerText = isLoginMode ? "Giriş" : "Kayıt Ol";
        toggleText.innerHTML = isLoginMode 
            ? 'Hesabınız yok mu? <a href="#" id="toggle-link">Kayıt Olun</a>' 
            : 'Zaten hesabınız var mı? <a href="#" id="toggle-link">Giriş Yapın</a>';
        
        authError.style.display = 'none';
    }
});

// --- FORM GÖNDERME (Giriş & Kayıt) ---
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    if (isLoginMode) {
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log("Giriş başarılı:", userCredential.user.email);
            })
            .catch((error) => {
                authError.innerText = "Hata: Bilgileriniz hatalı.";
                authError.style.display = 'block';
            });
    } else {
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                alert("Kaydınız başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz.");
                authForm.reset();
                if(document.querySelector('#toggle-link')) document.querySelector('#toggle-link').click(); 
            })
            .catch((error) => {
                authError.innerText = "Kayıt hatası: " + error.message;
                authError.style.display = 'block';
            });
    }
});

// --- OTURUM DURUMU VE ROL YÖNLENDİRMESİ ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Eğer giriş yapan kişi TEKNİK SERVİS ise onu servis sayfasına gönder!
        if (techServiceEmails.includes(user.email)) {
            window.location.href = "service.html"; 
        } else {
            // Normal Kullanıcı ise kendi panelini göster
            authContainer.style.display = 'none';
            if(dashboardSection) dashboardSection.style.display = 'block';
        }
    } else {
        // Kullanıcı çıkış yapmışsa formu göster
        authContainer.style.display = 'block';
        if(dashboardSection) dashboardSection.style.display = 'none';
    }
});

// --- ÇIKIŞ SİSTEMİ (Müşteri Paneli İçin) ---
document.addEventListener('click', (e) => {
    // Tıklanan öğe çıkış butonu mu yoksa butonun içindeki SVG ikonu mu kontrol ediyoruz
    const logoutBtn = e.target.closest('#logout-btn');
    if (logoutBtn) {
        signOut(auth).then(() => {
            console.log("Güvenli çıkış yapıldı.");
            window.location.reload(); 
        }).catch((error) => {
            console.error("Çıkış yapılırken hata:", error);
        });
    }
});