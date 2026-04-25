// js/auth.js

import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// --- HTML ELEMENTLERİ ---
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const authTitle = document.getElementById('auth-title');
const toggleText = document.getElementById('toggle-text');
const authError = document.getElementById('auth-error');

// --- AYARLAR ---
let isLoginMode = true;
// Buraya teknik servis yetkisi vermek istediğiniz e-postaları ekleyin
const techServiceEmails = ["servis@teknikzeka.app", "admin@test.com"]; 

// --- GİRİŞ / KAYIT MODU DEĞİŞTİRME ---
if(toggleText) {
    toggleText.addEventListener('click', (e) => {
        if(e.target.tagName === 'A') {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            
            authTitle.innerText = isLoginMode ? "Sisteme Giriş" : "Kayıt Ol";
            authBtn.innerText = isLoginMode ? "Giriş Yap" : "Kayıt Ol";
            toggleText.innerHTML = isLoginMode 
                ? 'Hesabınız yok mu? <a href="#" id="toggle-link">Hemen Kayıt Olun</a>' 
                : 'Zaten hesabınız var mı? <a href="#" id="toggle-link">Giriş Yapın</a>';
            
            authError.style.display = 'none';
        }
    });
}

// --- FORM GÖNDERME (Giriş & Kayıt) ---
if(authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        if (isLoginMode) {
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    console.log("Giriş başarılı:", userCredential.user.email);
                    // Yönlendirme işlemi onAuthStateChanged içinde otomatik yapılacak
                })
                .catch((error) => {
                    authError.innerText = "Hata: E-posta veya şifre hatalı.";
                    authError.style.display = 'block';
                });
        } else {
            createUserWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    alert("Kaydınız başarıyla oluşturuldu! Sisteme yönlendiriliyorsunuz...");
                })
                .catch((error) => {
                    authError.innerText = "Kayıt hatası: " + error.message;
                    authError.style.display = 'block';
                });
        }
    });
}

// --- OTURUM DURUMU VE YÖNLENDİRME (ROUTING) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Eğer giriş yapan kişi TEKNİK SERVİS ise onu servis sayfasına gönder
        if (techServiceEmails.includes(user.email)) {
            window.location.href = "service.html"; 
        } 
        // Normal Müşteri ise dashboard (panel) sayfasına gönder
        else {
            window.location.href = "dashboard.html";
        }
    } 
    // Kullanıcı giriş yapmamışsa hiçbir şey yapma, login sayfasında kalsın.
});