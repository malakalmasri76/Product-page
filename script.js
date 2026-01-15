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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const grid = document.getElementById("productsGrid");
    if (!grid) return;
    
    const start = (page - 1) * itemsPerPage;
    const products = filteredProducts.slice(start, start + itemsPerPage);

    grid.innerHTML = products.map((product) => {
        const isOutOfStock = product["الحالة"] === "نفذت الكمية";
        
        // التحقق من وجود عرض (إذا كان حقل العرض فارغاً أو يحتوي على 0)
        const hasOffer = product["العرض"] && product["العرض"].toString().trim() !== "" && product["العرض"] !== "0";
        
        // اختيار السعر الذي سيتم إضافته للسلة (سعر العرض إذا وجد، وإلا السعر العادي)
        const rawPrice = (hasOffer && product["السعر بعد العرض"]) ? 
                         product["السعر بعد العرض"].toString().replace(/[^\d]/g, '') : 
                         product["السعر"].toString().replace(/[^\d]/g, '');

        const cartItem = cart.find((item) => item.name === product["اسم المنتج"]);
        const quantityInCart = cartItem ? cartItem.qty : 0;

        return `
        <div class="product-card-container">
            <div class="product-card-inner" ondblclick="this.classList.toggle('is-flipped')">
                
                <div class="card-front bg-white border border-slate-100 shadow-sm">
                    <div class="relative h-40 bg-white p-2 border-b border-gray-50">
                        <img src="${fixImageUrl(product["الصورة"])}" class="w-full h-full object-contain">
                        ${isOutOfStock ? `<div class="out-of-stock-badge">نفذت الكمية</div>` : ""}
                    </div>

                    <div class="p-3 text-right">
                        <div class="flex items-start justify-between gap-2 mb-2 min-h-[40px]">
                            <h3 class="font-bold text-slate-800 text-[15px] leading-tight flex-grow">${product["اسم المنتج"]}</h3>
                            <div onclick="event.stopPropagation()">
                                ${quantityInCart === 0 ? `
                                    <button onclick="addToCart('${product["اسم المنتج"]}', '${rawPrice}')" 
                                        class="w-8 h-8 bg-yellow-400 text-white rounded-lg flex items-center justify-center transition-all ${isOutOfStock ? 'opacity-30 pointer-events-none' : ''}">
                                        <span class="material-icons-outlined text-sm">add_shopping_cart</span>
                                    </button>
                                ` : `
                                    <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                                        <button onclick="changeQtyByName('${product["اسم المنتج"]}', 1)" class="w-6 h-6 bg-white rounded flex items-center justify-center text-[10px] font-bold shadow-sm">+</button>
                                        <span class="text-[10px] font-black px-1">${quantityInCart}</span>
                                        <button onclick="changeQtyByName('${product["اسم المنتج"]}', -1)" class="w-6 h-6 bg-white rounded flex items-center justify-center text-[10px] font-bold shadow-sm">-</button>
                                    </div>
                                `}
                            </div>
                        </div>
                        
                        <div class="space-y-1 text-[13px]">
                            ${hasOffer ? `
                                <div class="flex justify-between border-b border-gray-50 pb-0.5">
                                    <span class="text-slate-500">السعر:</span>
                                    <span class="text-slate-800">${globalFormatPrice(product["السعر"])}</span>
                                </div>
                                <div class="flex justify-between border-b border-gray-50 pb-0.5">
                                    <span class="text-slate-500">العرض:</span>
                                    <span class="font-bold text-blue-600">${product["العرض"]}</span>
                                </div>
                                <div class="flex justify-between bg-red-50 p-1 rounded">
                                    <span class="text-red-700 font-bold">سعر العرض:</span>
                                    <span class="font-black text-red-700">${globalFormatPrice(product["السعر بعد العرض"])}</span>
                                </div>
                            ` : `
                                <div class="flex justify-between border-b border-gray-50 pb-0.5">
                                    <span class="text-slate-500">السعر:</span>
                                    <span class="font-black text-slate-800 text-[13px]">${globalFormatPrice(product["السعر"])}</span>
                                </div>
                            `}
                            
                            ${product["العدد"] ? `
                                <div class="flex justify-between pt-0.5 text-gray-500">
                                    <span>العدد بالكرتون:</span>
                                    <span>${product["العدد"]}</span>
                                </div>` : ""
                            }
                            
                            <div class="flex justify-between pt-0.5">
                                <span class="text-slate-500">سعر الرف:</span>
                                <span class="font-bold text-green-700">${globalFormatPrice(product["سعر الرف"])}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card-back shadow-2xl">
                    <span class="material-icons-outlined text-yellow-400 text-3xl mb-2">stars</span>
                    <h3 class="text-xs font-bold mb-2 uppercase">سعرالجملة</h3>
                    <div class="bg-white/10 w-full py-2 rounded-lg border border-white/20 mb-2">
                        <span class="text-xl font-black text-yellow-400">${globalFormatPrice(product["سعر الجملة"])}</span>
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
