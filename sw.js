<<<<<<< HEAD
const CACHE_NAME = 'sallat-iraq-v2'; // تحديث الإصدار عند كل تعديل كبير
const ASSETS = [
  './',
  './index.html',
  './script.js',      // ضروري جداً
  './style.css',      // ضروري جداً
  'https://cdn.tailwindcss.com?plugins=forms,typography',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined',
  'https://i.ibb.co/F4gw7BnV/logo.png'
];

// 1. التثبيت: تخزين الملفات الثابتة
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching assets...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. التفعيل: تنظيف الملفات القديمة من الإصدارات السابقة
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. جلب البيانات: استراتيجية "الشبكة أولاً" (Network First)
self.addEventListener('fetch', event => {
  // تجاوز روابط Google Sheets لضمان عدم تخزين بيانات قديمة بشكل دائم
  if (event.request.url.includes('google.com/spreadsheets')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // إذا كان الرد ناجحاً، خزن نسخة منه
        if (response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request)) // العمل (أوفلاين) عند فشل الشبكة
  );
=======
const CACHE_NAME = 'sallat-iraq-v2'; // تحديث الإصدار عند كل تعديل كبير
const ASSETS = [
  './',
  './index.html',
  './script.js',      // ضروري جداً
  './style.css',      // ضروري جداً
  'https://cdn.tailwindcss.com?plugins=forms,typography',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined',
  'https://i.ibb.co/F4gw7BnV/logo.png'
];

// 1. التثبيت: تخزين الملفات الثابتة
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching assets...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. التفعيل: تنظيف الملفات القديمة من الإصدارات السابقة
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. جلب البيانات: استراتيجية "الشبكة أولاً" (Network First)
self.addEventListener('fetch', event => {
  // تجاوز روابط Google Sheets لضمان عدم تخزين بيانات قديمة بشكل دائم
  if (event.request.url.includes('google.com/spreadsheets')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // إذا كان الرد ناجحاً، خزن نسخة منه
        if (response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request)) // العمل (أوفلاين) عند فشل الشبكة
  );
>>>>>>> 8f925584957007641fb1e8a68c21d07d4076b0ad
});