// js/auth.js
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile, sendEmailVerification, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const authForm = document.getElementById('auth-form');
const firstNameInput = document.getElementById('first-name');
const lastNameInput = document.getElementById('last-name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const authTitle = document.getElementById('auth-title');
const toggleText = document.getElementById('toggle-text');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');
const forgotPasswordLink = document.getElementById('forgot-password-link');

// YENİ ELEMENTLER
const accTypeRadios = document.querySelectorAll('input[name="acc-type"]');
const accountTypeContainer = document.getElementById('account-type-container');
const companyNameInput = document.getElementById('company-name');
const secretCodeInput = document.getElementById('secret-code');

let isLoginMode = true;

// ÖZEL/VIP MAİLLER (Bu mailler doğrulama adımını atlayıp direkt girer)
const vipEmails = ["servis@teknikzeka.app", "admin@test.com"]; 

if(toggleText) {
    toggleText.addEventListener('click', (e) => {
        if(e.target.tagName === 'A') {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            
            authTitle.innerText = isLoginMode ? "Sisteme Giriş" : "Yeni Hesap Oluştur";
            authBtn.innerText = isLoginMode ? "Giriş Yap" : "Kayıt Ol";
            forgotPasswordLink.style.display = isLoginMode ? "inline-block" : "none";
            
            firstNameInput.style.display = isLoginMode ? "none" : "block";
            lastNameInput.style.display = isLoginMode ? "none" : "block";
            accountTypeContainer.style.display = isLoginMode ? "none" : "block";
            
            firstNameInput.required = !isLoginMode;
            lastNameInput.required = !isLoginMode;

            // Form sıfırlama
            document.querySelector('input[value="musteri"]').checked = true;
            companyNameInput.style.display = "none";
            secretCodeInput.style.display = "none";
            companyNameInput.required = false;
            secretCodeInput.required = false;
            
            toggleText.innerHTML = isLoginMode 
                ? 'Hesabınız yok mu? <a href="#" id="toggle-link" style="color: var(--primary); font-weight: bold;">Hemen Kayıt Olun</a>' 
                : 'Zaten hesabınız var mı? <a href="#" id="toggle-link" style="color: var(--primary); font-weight: bold;">Giriş Yapın</a>';
            
            authError.style.display = 'none'; authSuccess.style.display = 'none';
        }
    });
}

// SERVİS SEÇİMİ DİNLEYİCİSİ
accTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if(e.target.value === 'servis') {
            companyNameInput.style.display = "block";
            secretCodeInput.style.display = "block";
            companyNameInput.required = true;
            secretCodeInput.required = true;
        } else {
            companyNameInput.style.display = "none";
            secretCodeInput.style.display = "none";
            companyNameInput.required = false;
            secretCodeInput.required = false;
        }
    });
});

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return showError("Lütfen e-posta adresinizi yazın.");
    sendPasswordResetEmail(auth, email).then(() => showSuccess("Sıfırlama linki e-postanıza gönderildi.")).catch(() => showError("Hesap bulunamadı."));
});

if(authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const accType = document.querySelector('input[name="acc-type"]:checked')?.value || "musteri";

        authError.style.display = 'none'; authSuccess.style.display = 'none';
        authBtn.innerText = "Lütfen bekleyin..."; authBtn.disabled = true;

        if (isLoginMode) {
            signInWithEmailAndPassword(auth, email, password)
                .then(async (userCredential) => {
                    const user = userCredential.user;
                    // VİP MAİL KONTROLÜ: VIP değilse ve doğrulanmamışsa engelle!
                    if (!user.emailVerified && !vipEmails.includes(user.email)) {
                        await signOut(auth);
                        showError("Giriş yapabilmek için e-posta adresinizi doğrulamanız gerekmektedir. Lütfen mail kutunuzu (Spam/Gereksiz dahil) kontrol edin.");
                        authBtn.innerText = "Giriş Yap"; authBtn.disabled = false;
                    }
                })
                .catch(() => { showError("E-posta adresiniz veya şifreniz hatalı."); authBtn.innerText = "Giriş Yap"; authBtn.disabled = false; });
        } else {
            // YENİ GÜVENLİK KONTROLÜ
            if (accType === 'servis' && secretCodeInput.value.trim() !== "TZ-2026-SERVIS") {
                showError("GÜVENLİK KODU HATALI! Teknik servis kaydı oluşturabilmek için yöneticiden geçerli bir onay kodu almalısınız.");
                authBtn.innerText = "Kayıt Ol"; authBtn.disabled = false;
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                await updateProfile(user, { displayName: `${firstName} ${lastName}` });

                // Veritabanına rolü ve firma adını kaydet
                await setDoc(doc(db, "users", user.uid), {
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    role: accType,
                    companyName: accType === 'servis' ? companyNameInput.value.trim() : "",
                    createdAt: serverTimestamp(),
                    notifSystem: true,
                    notifEmail: true
                });

                // E-posta gönderimi
                await sendEmailVerification(user);

                // VIP MAİL KONTROLÜ: Eğer VIP bir mail ile kayıt olunduysa, çıkış yaptırma, direkt girsin!
                if (!vipEmails.includes(user.email)) {
                    // Normal kullanıcı, çıkış yaptır ve onay bekle
                    await signOut(auth);

                    isLoginMode = true;
                    authTitle.innerText = "Sisteme Giriş"; authBtn.innerText = "Giriş Yap";
                    forgotPasswordLink.style.display = "inline-block";
                    firstNameInput.style.display = "none"; lastNameInput.style.display = "none";
                    accountTypeContainer.style.display = "none"; companyNameInput.style.display = "none"; secretCodeInput.style.display = "none";
                    firstNameInput.required = false; lastNameInput.required = false; companyNameInput.required = false; secretCodeInput.required = false;
                    toggleText.innerHTML = 'Hesabınız yok mu? <a href="#" id="toggle-link" style="color: var(--primary); font-weight: bold;">Hemen Kayıt Olun</a>';
                    authForm.reset();

                    showSuccess("✅ Kayıt başarılı! Ancak giriş yapabilmek için e-posta adresinize gönderdiğimiz onay linkine tıklamalısınız.\n\n⚠️ ÖNEMLİ: Mail gelmediyse lütfen Spam / Gereksiz klasörünüzü kontrol ediniz.");
                } else {
                    // VIP mail ile kayıt olunduysa direkt panele geçeceği için mesaj veriyoruz
                    showSuccess("👑 Yönetici/Özel hesap oluşturuldu. Sisteme giriş yapılıyor...");
                }

            } catch (error) {
                let msg = "Kayıt olurken bir hata oluştu.";
                if(error.code === 'auth/email-already-in-use') msg = "Bu e-posta adresi zaten kullanılıyor.";
                if(error.code === 'auth/weak-password') msg = "Şifreniz çok zayıf. En az 6 karakter olmalı.";
                showError(msg);
            } finally { 
                authBtn.innerText = isLoginMode ? "Giriş Yap" : "Kayıt Ol"; 
                authBtn.disabled = false; 
            }
        }
    });
}

function showError(msg) { authError.innerText = msg; authError.style.display = 'block'; authSuccess.style.display = 'none'; }
function showSuccess(msg) { authSuccess.innerHTML = msg.replace(/\n/g, '<br>'); authSuccess.style.display = 'block'; authError.style.display = 'none'; }

// DİNAMİK ROL KONTROLÜ (Veritabanından)
onAuthStateChanged(auth, async (user) => {
    // KULLANICI DOĞRULANMIŞSA VEYA VIP LİSTESİNDEYSE İÇERİ AL
    if (user && (user.emailVerified || vipEmails.includes(user.email))) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if(userDoc.exists()) {
            if (userDoc.data().role === "servis") { window.location.href = "service.html"; } 
            else { window.location.href = "tickets.html"; }
        }
    } 
});