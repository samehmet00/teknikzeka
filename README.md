<div align="center">

# ⚡ TeknikZeka

### Yapay Zekâ Destekli Teknik Servis & Fiyat Pazarlık Platformu

[![Live Demo](https://img.shields.io/badge/🌐_Canlı_Demo-GitHub_Pages-4F46E5?style=for-the-badge)](https://samehmet00.github.io/teknikzeka/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FF6600?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Groq AI](https://img.shields.io/badge/AI-Llama_3_70B_(Groq)-00A67E?style=for-the-badge)](https://groq.com/)
[![License](https://img.shields.io/badge/Lisans-MIT-blue?style=for-the-badge)](LICENSE)

Cihazı arızalanan kullanıcıları yapay zeka ön teşhisiyle doğru servise yönlendiren, müşteri ile teknik servis arasında **gerçek zamanlı fiyat pazarlığı** imkânı sunan modern B2C web uygulaması.

</div>

---

## 📸 Ekran Görüntüleri

> ℹ️ Aşağıdaki alanlara proje ekran görüntülerini ekleyin. `img/` klasörüne görselleri yükledikten sonra yorum satırlarını kaldırın.

<table>
  <tr>
    <td align="center"><b>🏠 Ana Sayfa</b></td>
    <td align="center"><b>📋 Müşteri — Bilet Listesi</b></td>
  </tr>
  <tr>
    <td>
      <!-- Ana sayfanın ekran görüntüsünü buraya ekleyin -->
      <!-- ![Ana Sayfa](img/screenshots/homepage.png) -->
      <img src="https://placehold.co/480x300/0f172a/4F46E5?text=Ana+Sayfa+Ekran+Görüntüsü" alt="Ana Sayfa" width="480"/>
    </td>
    <td>
      <!-- Müşteri bilet listesinin ekran görüntüsünü buraya ekleyin -->
      <!-- ![Bilet Listesi](img/screenshots/tickets.png) -->
      <img src="https://placehold.co/480x300/0f172a/10B981?text=Bilet+Listesi+Ekran+Görüntüsü" alt="Bilet Listesi" width="480"/>
    </td>
  </tr>
  <tr>
    <td align="center"><b>🔧 Servis Paneli</b></td>
    <td align="center"><b>💬 Fiyat Pazarlık Sayfası</b></td>
  </tr>
  <tr>
    <td>
      <!-- Servis panelinin ekran görüntüsünü buraya ekleyin -->
      <!-- ![Servis Paneli](img/screenshots/service.png) -->
      <img src="https://placehold.co/480x300/0f172a/F59E0B?text=Servis+Paneli+Ekran+Görüntüsü" alt="Servis Paneli" width="480"/>
    </td>
    <td>
      <!-- Pazarlık sayfasının ekran görüntüsünü buraya ekleyin -->
      <!-- ![Pazarlık](img/screenshots/offer.png) -->
      <img src="https://placehold.co/480x300/0f172a/EF4444?text=Pazarlık+Sayfası+Ekran+Görüntüsü" alt="Pazarlık Sayfası" width="480"/>
    </td>
  </tr>
  <tr>
    <td align="center"><b>🤖 YZ Ön Teşhis Raporu</b></td>
    <td align="center"><b>📦 Süreç Takip Sayfası</b></td>
  </tr>
  <tr>
    <td>
      <!-- YZ teşhis raporunun ekran görüntüsünü buraya ekleyin -->
      <!-- ![YZ Rapor](img/screenshots/ai-report.png) -->
      <img src="https://placehold.co/480x300/0f172a/4F46E5?text=YZ+Teşhis+Raporu+Ekran+Görüntüsü" alt="YZ Rapor" width="480"/>
    </td>
    <td>
      <!-- Süreç takip sayfasının ekran görüntüsünü buraya ekleyin -->
      <!-- ![Süreç Takip](img/screenshots/track.png) -->
      <img src="https://placehold.co/480x300/0f172a/10B981?text=Süreç+Takip+Ekran+Görüntüsü" alt="Süreç Takip" width="480"/>
    </td>
  </tr>
</table>

---

## 🎯 Projenin Amacı

Cihazı arızalanan kullanıcılar çoğu zaman sorunun teknik adını bilmeden servise gidiyor, servisler ise teşhis için saatlerini harcıyor. **TeknikZeka** bu süreci ikisi için de kolaylaştırır:

- **Müşteri** basit bir şikayet yazar → Yapay zeka anında ön teşhis raporu üretir.
- Rapor **iş havuzuna** düşer, ilgili teknik servisler teklif verir.
- Müşteri ile servis, hem **tamir** hem de **satış** ilanları için **gerçek zamanlı pazarlık** masasına oturur.
- Anlaşma sağlanınca **otomatik kargo kodu** oluşturulur, süreç adım adım takip edilir.

---

## ✨ Öne Çıkan Özellikler

### 🤖 Yapay Zeka Entegrasyonu — Llama 3 70B (Groq)
- Kullanıcının girdiği şikayeti saniyeler içinde analiz eder.
- **Olası Arıza**, **Onarım Zorluğu (1–10)**, **Tahmini Süre** ve **Aciliyet Seviyesi** üretir.
- Kötüye kullanımı önlemek için katı *Prompt Engineering* filtresi uygulanır.
- Groq API'nin ultra-düşük gecikmesi sayesinde yanıt anında gelir.

### 💬 Gerçek Zamanlı Fiyat Pazarlığı
- **Satılık ilanlar:** Servis teklif verir → Müşteri karşı fiyat önerir → Servis kabul/reddeder veya yeni karşı teklif gönderir.
- **Tamir ilanlar:** Servis tamir fiyatı girer → Müşteri pazarlık eder → Anlaşma sağlanınca süreç başlar.
- Servis panelinde müşteri karşı teklifi geldiğinde **gerçek zamanlı bildirim banner'ı** görünür.
- Pazarlık geçmişi zaman damgasıyla kayıt altına alınır.

### 👥 Çift Taraflı Rol Yönetimi (Firebase Auth)
| Müşteri Paneli | Servis Paneli |
|---|---|
| Yeni arıza / satış kaydı oluşturma | İş havuzunu filtreleyerek tarama |
| YZ ön teşhis raporunu görme | Tamir veya satış teklifi verme |
| Teklifleri karşılaştırma & seçim yapma | Kabul/Red/Karşı Teklif gönderme |
| Pazarlık sayfasına erişim | Aktif işleri yönetme |
| Kargo kodunu görme & takip etme | İptal taleplerini onaylama |
| Servisi puanlama (1–5 ⭐) | Süreç adımlarını güncelleme |

### 📦 Süreç Takip Sistemi
- Anlaşma sonrası **otomatik kargo kodu** üretilir.
- `track.html` üzerinden süreç adım adım takip edilir.
- Hem müşteri hem servis aynı sayfada ilerlemeyi görür.

### 💬 Anlık Mesajlaşma
- Her ticket için müşteri–servis arasında özel mesajlaşma kanalı.
- `chats.html` tüm konuşmaları listeler.
- Mesajlar Firestore üzerinden gerçek zamanlı senkronize edilir.

### 🔔 Bildirim Sistemi
- Teklif, karşı teklif, kabul/ret, kargo kodu gibi olaylar için **anlık uygulama içi bildirim**.
- Kullanıcı tercihine göre **e-posta bildirimi** (EmailJS entegrasyonu).
- Okunmamış bildirim sayacı nav-bar'da görünür.

### 🎨 Modern UI/UX
- **Koyu/Açık Tema** desteği, kullanıcı tercihiyle kalıcı olarak saklanır.
- **Glassmorphism** kart tasarımı, gradient kenarlıklar, micro-animasyonlar.
- Akordiyon kart yapısı, iskelet yükleme ekranları (skeleton), sayfalama.
- Tam **mobil uyumlu** responsive tasarım.
- Google Fonts (Outfit) ile profesyonel tipografi.

### ⭐ Servis Değerlendirme Sistemi
- İşlem tamamlandıktan sonra müşteri servisi **yarım yıldız hassasiyetinde** 1–5 puanla değerlendirir.
- Puanlar servis panelinde ve herkese açık `service-reviews.html` sayfasında görünür.

---

## 🛠 Kullanılan Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | HTML5, CSS3 (Custom Properties & Animations), Vanilla JS (ES6 Modules) |
| **Backend / BaaS** | Firebase Authentication + Cloud Firestore (Realtime NoSQL) |
| **Yapay Zeka** | Llama 3 70B — Groq API |
| **E-posta** | EmailJS |
| **Hosting** | GitHub Pages |

> Herhangi bir harici frontend framework (React, Vue, Angular vb.) kullanılmamıştır.

---

## 🚀 Kurulum ve Çalıştırma

### 1. Repoyu klonlayın
```bash
git clone https://github.com/samehmet00/teknikzeka.git
cd teknikzeka
```

### 2. Firebase yapılandırması
`js/firebase-config.js` dosyasını kendi Firebase projenizin bilgileriyle güncelleyin:
```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  // ...
};
```

Firestore'da aşağıdaki koleksiyonları oluşturun:
- `tickets` · `negotiations` · `notifications` · `users` · `reviews`

### 3. Groq API Anahtarı
`js/app.js` dosyasındaki `GROQ_API_KEY` değişkenine kendi anahtarınızı girin.

### 4. Yerel sunucu ile çalıştırın
VS Code kullanıyorsanız **Live Server** eklentisi ile `index.html`'i açın.

> ⚠️ **Önemli:** Proje ES6 Modülleri (`type="module"`) kullandığından `file:///` protokolüyle değil, mutlaka bir **localhost** sunucu üzerinden açılmalıdır.

---

## 📁 Proje Yapısı

```
teknikzeka/
├── index.html                  # Ana sayfa (Landing Page)
├── pages/
│   ├── dashboard.html          # Müşteri — Arıza Kaydı Oluşturma
│   ├── tickets.html            # Müşteri — Bilet Listesi & Teklif Yönetimi
│   ├── service.html            # Servis Paneli
│   ├── offer.html              # Fiyat Pazarlık Sayfası
│   ├── track.html              # Süreç Takip
│   ├── chat.html               # Tekete Özel Mesajlaşma
│   ├── chats.html              # Tüm Konuşmalar
│   ├── notifications.html      # Bildirimler
│   ├── service-reviews.html    # Servis Değerlendirme Sayfası
│   ├── profile.html            # Profil Yönetimi
│   ├── settings.html           # Ayarlar (Tema, Bildirim vb.)
│   ├── login.html              # Giriş / Kayıt
│   └── about.html              # Hakkında
├── js/
│   ├── app.js                  # Dashboard — YZ entegrasyonu
│   ├── tickets.js              # Müşteri bilet mantığı
│   ├── service.js              # Servis paneli mantığı
│   ├── offer.js                # Pazarlık sayfası mantığı
│   ├── track.js                # Süreç takip mantığı
│   ├── auth.js                 # Kimlik doğrulama
│   ├── notifications.js        # Bildirim sistemi
│   ├── chat.js                 # Mesajlaşma
│   ├── profile.js              # Profil yönetimi
│   ├── settings.js             # Ayarlar
│   ├── icons.js                # SVG ikon kütüphanesi
│   ├── deviceData.js           # Cihaz marka/model verisi
│   ├── theme-manager.js        # Koyu/Açık tema yönetimi
│   └── firebase-config.js      # Firebase yapılandırması
└── css/                        # Sayfa bazlı stil dosyaları
```

---

## 👨‍💻 Geliştirici

**Mehmet ŞA** — İnönü Üniversitesi, Bilgisayar Mühendisliği

Bu proje *İnternet Programcılığı* dersi kapsamında geliştirilmiştir.

[![GitHub](https://img.shields.io/badge/GitHub-samehmet00-181717?style=flat-square&logo=github)](https://github.com/samehmet00)