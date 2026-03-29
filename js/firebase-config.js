// js/firebase-config.js

// Firebase çekirdek uygulamasını ve ihtiyacımız olan servisleri içe aktarıyoruz
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// LÜTFEN DİKKAT: Aşağıdaki objenin içini Firebase Console'dan kopyaladığınız kendi bilgilerinizle değiştirin!
const firebaseConfig = {
  apiKey: "AIzaSyDzW-8XVwjHkT4Wl7dGHRdWOyZZXL2Ctpc",
  authDomain: "teknikzeka-643e8.firebaseapp.com",
  projectId: "teknikzeka-643e8",
  storageBucket: "teknikzeka-643e8.firebasestorage.app",
  messagingSenderId: "260160755142",
  appId: "1:260160755142:web:71705eba1489ef58cfcec7"
};

// Firebase'i Başlat
const app = initializeApp(firebaseConfig);

// Diğer JS dosyalarında kullanabilmek için Auth ve Veritabanı (Firestore) servislerini dışa aktarıyoruz
export const auth = getAuth(app);
export const db = getFirestore(app);