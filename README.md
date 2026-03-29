# 🚀 TeknikZeka - Yapay Zekâ Destekli Teknik Servis Yönetim Sistemi

Geleneksel arıza tespit süreçlerini Google Gemini Yapay Zekâ modeli ile hızlandıran, müşteri ile teknik servisi "İhale Mantığı" ile tek bir platformda buluşturan modern bir B2C web uygulaması.

![TeknikZeka Banner](https://via.placeholder.com/1000x400/4F46E5/FFFFFF?text=TeknikZeka+Yapay+Zeka+Destekli+Servis)

## 🌟 Projenin Amacı
Cihazı bozulan kullanıcılar genellikle sorunun ne olduğunu tam olarak bilemez ve teknik servise eksik bilgi verir. Servisler ise arıza tespitine saatlerini harcar. **TeknikZeka**, müşterinin girdiği basit şikayetleri gelişmiş dil modelleriyle analiz ederek anında donanımsal bir "Ön Teşhis Raporu" oluşturur. Oluşturulan bu biletler (ticket) yerel servislere düşer ve servisler cihazı tamir etmek için müşteriye talep gönderir.

## ✨ Öne Çıkan Özellikler

### 🤖 Yapay Zeka Entegrasyonu (Gemini 2.5 Flash)
* Müşteri şikayetini okuyup saniyeler içinde **Olası Arıza**, **Zorluk Derecesi (1-10)** ve **Önerilen Çözüm** sunar.
* Gereksiz sohbetleri filtreleyen katı bir *Prompt Engineering* yapısı kullanır.

### 👥 Çift Taraflı Rol Yönetimi (Firebase Auth)
* **Müşteri Paneli:** Yeni arıza kaydı oluşturma, geçmiş talepleri görme ve teklif veren servisler arasından seçim yapma.
* **Teknik Servis Paneli:** Sisteme düşen tüm arıza kayıtlarını "Akordiyon" menü yapısında detaylıca inceleme ve "Ben Yapabilirim" diyerek ihaleye katılma.

### 💎 Modern ve Dinamik Kullanıcı Arayüzü (UI/UX)
* **Koyu / Açık Tema:** Kullanıcı tercihini `localStorage` ile hatırlayan, sistem geneline entegre dinamik renk paleti.
* **Swipe-to-Delete:** Müşteri panelinde kayıtları iOS/Android uygulamalarındaki gibi kaydırarak silme animasyonu.
* **Gelişmiş Filtreleme:** Teknik servis panelinde cihazları kategorisine, markasına, modeline ve güncel ihale durumuna göre anında filtreleme.
* **Sinematik Kaydırma:** Ana sayfada (Landing Page) Scroll-Jacking ve Intersection Observer ile tetiklenen modern metin animasyonları.

## 🛠️ Kullanılan Teknolojiler

* **Frontend:** HTML5, CSS3 (Custom Properties & Animations), Vanilla JavaScript (ES6 Modules). *(Herhangi bir harici kütüphane kullanılmamıştır).*
* **Backend / BaaS:** Firebase Authentication, Cloud Firestore (Gerçek zamanlı NoSQL veritabanı).
* **Yapay Zeka:** Google Generative AI (Gemini) API.

## 🚀 Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda (Localhost) çalıştırmak için aşağıdaki adımları izleyin:

1. Projeyi bilgisayarınıza klonlayın:
   ```bash
   git clone [https://github.com/samehmet00/teknikzeka.git](https://github.com/samehmet00/teknikzeka.git)

2. Klonladığınız klasörün içine girin:
    Bash
    cd teknikzeka

3. Güvenlik nedeniyle projede yer alan js/firebase-config.js dosyasının içindeki konfigürasyon bilgilerini kendi Firebase projenizin ayarlarıyla değiştirin. Ayrıca Firestore veritabanınızda tickets adında bir koleksiyon (collection) oluşturmayı unutmayın.

4. js/app.js içerisindeki GEMINI_API_KEY değişkenine kendi Google AI Studio API anahtarınızı girin.

5. VS Code kullanıyorsanız Live Server eklentisi ile index.html dosyasını çalıştırın.

⚠️ Önemli Not: Projede ES6 Modülleri (type="module") kullanıldığı için uygulamanın düzgün çalışması adına tarayıcıda dosyaya çift tıklayarak (file:///) açmak yerine, kesinlikle bir yerel sunucu (localhost / Live Server) üzerinden açılması gerekmektedir.

📸 Ekran Görüntüleri
(Projeyi GitHub'a yükledikten sonra buraya uygulamanızın güzel ekran görüntülerini ekleyebilirsiniz.)

Ana Sayfa Karşılama: [Ekran Görüntüsü Ekle]

Müşteri Kayıt Sihirbazı: [Ekran Görüntüsü Ekle]

AI Raporu & Swipe to Delete: [Ekran Görüntüsü Ekle]

Servis İhale Paneli: [Ekran Görüntüsü Ekle]

👨‍💻 Geliştirici
Bu proje, İnternet Programcılığı dersi kapsamında geliştirilmiştir.

Geliştirici: Mehmet ŞA - İnönü Üniversitesi Bilgisayar Mühendisliği 

GitHub: samehmet00