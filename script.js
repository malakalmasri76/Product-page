// 1. الإعدادات والمتغيرات العالمية
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLyL8folfxpC5EsPlkv2vWBNROY064cbM3tbJ0bArIfJTWe3Fi1KB0SLMLiE8PLto32lGrT6Gzcr56/pub?output=csv";

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentCategory = "الكل";
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// 2. التحميل الأولي عند فتح الصفحة
window.onload = loadDataFromSheet;

// دالة عالمية لتنظيف وتنسيق أي سعر
function globalFormatPrice(value) {
  if (!value || value === "0") return "0 د.ع";
  // استخراج الأرقام فقط (حذف أي نصوص مدخلة في جوجل شيت بالخطأ)
  const digits = value.toString().replace(/[^\d]/g, "");
  if (!digits) return "---";
  // تحويل لرقم وتنسيقه مع إضافة العملة
  return Number(digits).toLocaleString() + " د.ع";
}

async function loadDataFromSheet() {
  Papa.parse(SHEET_URL, {
    download: true,
    header: true,
    complete: function (results) {
      let rawData = results.data.filter(
        (row) => row["اسم المنتج"] && row["اسم المنتج"].trim() !== ""
      );

      // ترتيب: المتوفر أولاً ثم النافذ
      rawData.sort((a, b) => {
        const statusA = (a["الحالة"] || "").trim();
        const statusB = (b["الحالة"] || "").trim();
        if (statusA === "نفذت الكمية" && statusB !== "نفذت الكمية") return 1;
        if (statusA !== "نفذت الكمية" && statusB === "نفذت الكمية") return -1;
        return 0;
      });

      allProducts = rawData;
      filteredProducts = [...allProducts];
      createCategoryButtons();
      updateCart();
      renderPage(1);
    },
  });
}

// 3. وظائف السلة الأساسية
function updateCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  const count = cart.reduce((sum, item) => sum + item.qty, 0);

  if (document.getElementById("cartCount"))
    document.getElementById("cartCount").innerText = count;

  const cartItems = document.getElementById("cartItems");
  let total = 0;

  if (!cartItems) return;

  if (cart.length === 0) {
    cartItems.innerHTML = `<div class="text-center py-20 text-gray-400 text-sm italic">السلة فارغة حالياً</div>`;
  } else {
    cartItems.innerHTML = cart
      .map((item, index) => {
        total += item.price * item.qty;
        return `
                <div class="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
                    <div class="text-right">
                        <h4 class="text-xs font-bold text-zinc-900">${
                          item.name
                        }</h4>
                        <p class="text-[10px] text-gray-400">${item.price.toLocaleString()} د.ع</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="changeQty(${index}, 1)" class="w-7 h-7 bg-gray-100 rounded">+</button>
                        <span class="text-xs font-bold">${item.qty}</span>
                        <button onclick="changeQty(${index}, -1)" class="w-7 h-7 bg-gray-100 rounded">-</button>
                    </div>
                </div>`;
      })
      .join("");
  }

  const formattedTotal = globalFormatPrice(total);
  if (document.getElementById("cartTotal"))
    document.getElementById("cartTotal").innerText = formattedTotal;
}

function addToCart(name, price) {
  const cleanPrice =
    typeof price === "string"
      ? parseInt(price.replace(/[^\d]/g, "")) || 0
      : price;
  const item = cart.find((i) => i.name === name);
  if (item) {
    item.qty++;
  } else {
    cart.push({ name, price: cleanPrice, qty: 1 });
  }
  updateCart();
  renderPage(currentPage);
}

// 4. وظائف الحذف والتأكيد (المودال)
function clearFullCart() {
  const modal = document.getElementById("confirmModal");
  const box = document.getElementById("modalBox");
  const overlay = document.getElementById("modalOverlay");

  modal.classList.remove("invisible");
  setTimeout(() => {
    overlay.classList.add("opacity-100");
    box.classList.remove("scale-90", "opacity-0");
    box.classList.add("scale-100", "opacity-100");
  }, 10);
}

function closeConfirmModal() {
  const modal = document.getElementById("confirmModal");
  const box = document.getElementById("modalBox");
  const overlay = document.getElementById("modalOverlay");

  overlay.classList.remove("opacity-100");
  box.classList.replace("scale-100", "scale-95");
  box.classList.replace("opacity-100", "opacity-0");

  setTimeout(() => {
    modal.classList.add("invisible");
    box.classList.remove("scale-95");
    box.classList.add("scale-90");
  }, 300);
}

function executeClearCart() {
  cart = [];
  updateCart();
  renderPage(currentPage);
  closeConfirmModal();
  setTimeout(() => toggleCart(), 500);
}

function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  updateCart();
  renderPage(currentPage);
}

function changeQtyByName(name, delta) {
  const index = cart.findIndex((item) => item.name === name);
  if (index !== -1) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
  }
  updateCart();
  renderPage(currentPage);
}

// 5. عرض المنتجات (UI) مع خاصية الـ Flip
function renderPage(page) {
    currentPage = page;
    // العودة لأعلى الصفحة عند التغيير
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const grid = document.getElementById("productsGrid");
    if (!grid) return;
    
    const start = (page - 1) * itemsPerPage;
    const products = filteredProducts.slice(start, start + itemsPerPage);

    grid.innerHTML = products.map((product, index) => {
        const isOutOfStock = product["الحالة"] === "نفذت الكمية";
        
        // التحقق من وجود عرض
        const hasOffer = product["العرض"] && product["العرض"].toString().trim() !== "" && product["العرض"] !== "0";
        
        // تجهيز السعر الخام للإضافة للسلة
        const rawPrice = (hasOffer && product["السعر بعد العرض"]) ? 
                         product["السعر بعد العرض"].toString().replace(/[^\d]/g, '') : 
                         product["السعر"]?.toString().replace(/[^\d]/g, '') || "0";

        const cartItem = cart.find((item) => item.name === product["اسم المنتج"]);
        const quantityInCart = cartItem ? cartItem.qty : 0;

        // حساب الفهرس الحقيقي للمنتج لاستخدامه في الـ Modal
        const productIndex = start + index;

        return `
        <div class="product-card-container">
            <div class="product-card-inner" id="card-${productIndex}">
                
                <div class="card-front bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden flex flex-col">
                    
                    <button onclick="event.stopPropagation(); document.getElementById('card-${productIndex}').classList.toggle('is-flipped')" 
                        class="absolute top-2 left-2 z-20 w-8 h-8 flex items-center justify-center shadow-sm">
                        <span class="material-icons-outlined text-[18px] text-slate-600 hidden">autorenew</span>
                    </button>

                    <div class="image-container relative w-full h-64 cursor-pointer" onclick="openProductModal(${productIndex})">
                        <img src="${fixImageUrl(product["الصورة"])}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110">
                        ${isOutOfStock ? `<div class="out-of-stock-badge">نفذت الكمية</div>` : ""}
                    </div>

                    <div class="p-4 text-right flex-grow flex flex-col">
                        <div class="flex items-start justify-between gap-2 mb-3 min-h-[40px]">
                            <h3 class="font-bold text-slate-800 text-[14px] leading-tight flex-grow cursor-pointer" onclick="openProductModal(${productIndex})">
                                ${product["اسم المنتج"]}
                            </h3>
                            <div onclick="event.stopPropagation()">
                                ${quantityInCart === 0 ? `
                                    <button onclick="addToCart('${product["اسم المنتج"]}', '${rawPrice}')" 
                                        class="w-9 h-9 bg-yellow-400 text-white rounded-xl flex items-center justify-center transition-all active:scale-90 ${isOutOfStock ? 'opacity-30 pointer-events-none' : ''}">
                                        <span class="material-icons-outlined text-[20px]">add_shopping_cart</span>
                                    </button>
                                ` : `
                                    <div class="flex items-center gap-1 bg-yellow-200 rounded-xl p-1 border border-gray-200">
                                        <button onclick="changeQtyByName('${product["اسم المنتج"]}', 1)" class="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center text-[12px] font-bold shadow-sm">+</button>
                                        <span class="text-[12px] font-black px-1">${quantityInCart}</span>
                                        <button onclick="changeQtyByName('${product["اسم المنتج"]}', -1)" class="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center text-[12px] font-bold shadow-sm">-</button>
                                    </div>
                                `}
                            </div>
                        </div>
                        
                        <div class="mt-auto space-y-1 text-[13px]">
                            ${hasOffer ? `
                                <div class="flex justify-between border-b border-gray-50 pb-0.5">
                                    <span class="text-red-700 font-bold">السعر:</span>
                                    <span class="text-red-700 font-bold">${globalFormatPrice(product["السعر"])}</span>
                                </div>
                                <div class="flex justify-between border-b border-gray-50 pb-0.5">
                                    <span class="text-slate-700">العرض:</span>
                                    <span class="text-slate-700">${product["العرض"]}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-700">سعر العرض:</span>
                                    <span class="text-slate-700">${globalFormatPrice(product["السعر بعد العرض"])}</span>
                                </div>
                            ` : `
                                <div class="flex justify-between border-b border-gray-50 pb-0.5">
                                    <span class="text-red-700 font-bold">السعر:</span>
                                    <span class="text-red-700 font-bold">${globalFormatPrice(product["السعر"])}</span>
                                </div>
                            `}
                            <div class="flex justify-between border-b border-gray-50 pb-0.5">
                                    <span class="text-slate-700 text-[10px] font-bold">سعر الرف</span>
                        <span class="text-slate-700 font-black">${globalFormatPrice(product["سعر الرف"])}</span>
                                </div>
                            
                        </div>
                    </div>
                </div>

                <div class="card-back shadow-2xl rounded-3xl flex flex-col items-center justify-center p-6 bg-slate-900 text-white text-center">
                    <button onclick="document.getElementById('card-${productIndex}').classList.toggle('is-flipped')" 
                        class="absolute top-4 left-4 text-white/50 hover:text-white transition-colors">
                        <span class="material-icons-outlined">close</span>
                    </button>

                    <span class="material-icons-outlined text-yellow-400 text-4xl mb-3">stars</span>
                    <h3 class="text-[11px] font-bold mb-2 uppercase tracking-[0.2em] text-yellow-500/80">سعر الجملة</h3>
                    <div class="bg-white/10 w-full py-3 rounded-2xl border border-white/20 mb-4">
                        <span class="text-2xl font-black text-white">${globalFormatPrice(product["سعر الجملة"])}</span>
                    </div>
                </div>

            </div>
        </div>`;
    }).join("");
    updatePaginationControls();
}

// 6. الأقسام والفلترة
function createCategoryButtons() {
  const container = document.getElementById("categoryBar");
  if (!container) return;
  const uniqueCategories = [
    "الكل",
    ...new Set(allProducts.map((p) => p["الفئة"]).filter((c) => c)),
  ];
  container.innerHTML = uniqueCategories
    .map(
      (cat) => `
        <button onclick="setCategory('${cat}')" 
            class="px-5 py-2 rounded-full border transition-all font-bold text-sm mb-2
            ${
              currentCategory === cat
                ? "bg-yellow-400 text-white border-yellow-400 shadow-md"
                : "bg-white text-slate-600 border-slate-200 shadow-sm"
            }">
            ${cat}
        </button>`
    )
    .join("");
}

function setCategory(cat) {
  currentCategory = cat;
  createCategoryButtons();
  filterProducts();
}

function filterProducts() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  filteredProducts = allProducts.filter((product) => {
    const name = (product["اسم المنتج"] || "").toLowerCase();
    const matchesCategory =
      currentCategory === "الكل" || product["الفئة"] === currentCategory;
    const matchesSearch = name.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });
  renderPage(1);
}

// 8. وظائف مساعدة
function toggleCart() {
  const drawer = document.getElementById("cartDrawer");
  const content = document.getElementById("cartContent");
  const overlay = document.getElementById("cartOverlay");
  if (drawer.classList.contains("invisible")) {
    drawer.classList.remove("invisible");
    overlay.classList.add("opacity-100");
    content.classList.remove("-translate-x-full");
  } else {
    overlay.classList.remove("opacity-100");
    content.classList.add("-translate-x-full");
    setTimeout(() => drawer.classList.add("invisible"), 300);
  }
}

function updatePaginationControls() {
  const container = document.getElementById("paginationButtons");
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = "";
    return;
  }
  let html = `<button onclick="changePage(${currentPage - 1})" ${
    currentPage === 1 ? "disabled" : ""
  } class="p-2 rounded-xl border bg-white disabled:opacity-30">
        <span class="material-icons-outlined">chevron_right</span>
    </button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button onclick="renderPage(${i})" class="w-10 h-10 rounded-xl font-bold ${
      i === currentPage ? "bg-yellow-400 text-white" : "bg-white text-slate-400"
    }">${i}</button>`;
  }
  html += `<button onclick="changePage(${currentPage + 1})" ${
    currentPage === totalPages ? "disabled" : ""
  } class="p-2 rounded-xl border bg-white disabled:opacity-30">
        <span class="material-icons-outlined">chevron_left</span>
    </button>`;
  container.innerHTML = html;
}

function changePage(newPage) {
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  if (newPage >= 1 && newPage <= totalPages) {
    renderPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function fixImageUrl(url) {
  if (!url) return "https://via.placeholder.com/300?text=No+Image";
  let u = url.trim();
  if (u.includes("drive.google.com")) {
    let id = u.split("/d/")[1]?.split("/")[0] || u.split("id=")[1];
    return `https://drive.google.com/uc?export=view&id=${id}`;
  }
  return u;
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then(() => console.log("Service Worker Registered"));
}
function openProductModal(index) {
    const product = filteredProducts[index];
    const modal = document.getElementById('productModal');
    const content = document.getElementById('modalContent');
    const body = document.getElementById('modalBody');

    // تأكدي أن هذه المتغيرات معرفة
    const hasOffer = product["العرض"] && product["العرض"] !== "0";
    const cartItem = cart.find((item) => item.name === product["اسم المنتج"]);
    const quantityInCart = cartItem ? cartItem.qty : 0;
    const isOutOfStock = product["الحالة"] === "نفذت الكمية";
    const rawPrice = (hasOffer && product["السعر بعد العرض"]) ? 
                     product["السعر بعد العرض"].toString().replace(/[^\d]/g, '') : 
                     product["السعر"]?.toString().replace(/[^\d]/g, '') || "0";

    // إجبار شكل المودال أن يكون مربعاً عبر الـ Style المباشر
    content.style.maxWidth = "450px"; 
    content.style.width = "90%";
    content.className = "bg-white rounded-[35px] overflow-hidden shadow-2xl transform transition-all duration-300";

    body.innerHTML = `
        <div class="flex flex-col">
            <div class="relative w-full h-72 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                <img src="${fixImageUrl(product["الصورة"])}" class="w-full h-full object-contain p-4">
                <button onclick="closeProductModal()" class="absolute top-4 right-4 bg-white/90 w-10 h-10 rounded-full flex items-center justify-center shadow-md">
                    <span class="material-icons-outlined text-gray-600">close</span>
                </button>
            </div>

            <div class="p-6 text-right">
                <h2 class="text-xl font-black text-slate-800 mb-4">${product["اسم المنتج"]}</h2>

                <div class="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
                    <div class="flex justify-between items-center">
                        <span class="text-red-700 font-bold text-sm">السعر</span>
                        <span class="text-red-700 text-lg">${globalFormatPrice(product["السعر"])}</span>
                    </div>
                    ${hasOffer ? `
                        <div class="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                            <span class="text-slate-800 font-bold text-sm">سعر العرض</span>
                            <span class="text-slate-800 text-xl">${globalFormatPrice(product["السعر بعد العرض"])}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="grid grid-cols-2 gap-3 mb-6">
                    <div class="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex flex-col items-center">
                        <span class="text-blue-600 text-[10px] font-bold">سعر الرف</span>
                        <span class="text-blue-700 font-black">${globalFormatPrice(product["سعر الرف"])}</span>
                    </div>
                    <div class="bg-orange-50/50 p-3 rounded-xl border border-orange-100 flex flex-col items-center">
                        <span class="text-orange-600 text-[10px] font-bold">العدد بالكرتون</span>
                        <span class="text-orange-700 font-black">${product["العدد"] || "---"}</span>
                    </div>
                </div>

                <div class="flex items-center justify-center">
                    ${quantityInCart === 0 ? `
                        <button onclick="addToCart('${product["اسم المنتج"]}', '${rawPrice}'); openProductModal(${index})" 
                            class="w-full h-14 bg-yellow-400 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform ${isOutOfStock ? 'opacity-30 pointer-events-none' : ''}">
                            <span class="material-icons-outlined">add_shopping_cart</span>
                            إضافة للسلة
                        </button>
                    ` : `
                        <div class="flex items-center justify-between w-full bg-yellow-200 p-2 rounded-2xl border border-gray-200 h-14">
                            <button onclick="changeQtyByName('${product["اسم المنتج"]}', 1); openProductModal(${index})" class="w-10 h-10 bg-gray-100 rounded-xl shadow-sm font-bold text-xl">+</button>
                            <span class="text-lg font-black">${quantityInCart}</span>
                            <button onclick="changeQtyByName('${product["اسم المنتج"]}', -1); openProductModal(${index})" class="w-10 h-10 bg-gray-100 rounded-xl shadow-sm font-bold text-xl">-</button>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    const content = document.getElementById('modalContent');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}





