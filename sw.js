const CACHE_NAME = 'sallat-iraq-v1';
const ASSETS = [
  './',
  './index.html', // تأكد أن هذا هو اسم ملف الموقع الرئيسي
  'https://cdn.tailwindcss.com?plugins=forms,typography',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined',
  'https://i.ibb.co/F4gw7BnV/logo.png'
];

// تثبيت الـ Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// استراتيجية "الشبكة أولاً ثم التخزين المؤقت" (Network First)
// لضمان جلب أحدث بيانات من Google Sheets إذا توفر الإنترنت
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // إذا نجح الاتصال، خزن نسخة من الرد (للصور والبيانات)
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return response;
      })
      .catch(() => caches.match(event.request)) // إذا فشل الاتصال (أوفلاين)، ابحث في التخزين
  );
});