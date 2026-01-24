
// 1. الإعدادات والمتغيرات العالمية
const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLyL8folfxpC5EsPlkv2vWBNROY064cbM3tbJ0bArIfJTWe3Fi1KB0SLMLiE8PLto32lGrT6Gzcr56/pub?output=csv";

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 999;
let currentCategory = "الكل";
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// 2. التحميل الأولي عند فتح الصفحة
window.onload = function () {
    loadDataFromSheet();

    // استرجاع حالة "وضع الزبون" من الذاكرة وتطبيقها
    const savedStatus = localStorage.getItem("noShameStatus");
    const toggleInput = document.getElementById("noShameToggle");

    // --- التعديل هنا ---
    const profitLabel = document.getElementById("profitLabel");

    if (savedStatus === "enabled" && toggleInput) {
        toggleInput.checked = true;
        document.body.classList.add("no-shame-active");

        // إذا كان الوضع مفعلاً، غير النص فوراً عند التحميل
        if (profitLabel) {
            profitLabel.innerText = "ربح الكرتون:";
        }
    }
};

// دالة عالمية لتنظيف وتنسيق أي سعر
function globalFormatPrice(value) {
    if (!value || value === "0") return "0 د.ع";

    // تحويل القيمة لنص
    let str = value.toString();

    // إذا كان هناك نقطة (مثل 7500.00)، نأخذ فقط ما قبل النقطة
    if (str.includes('.')) {
        str = str.split('.')[0];
    }

    // حذف أي شيء ليس رقماً (مثل £ أو الفواصل)
    const digits = str.replace(/[^\d]/g, "");

    if (!digits) return "---";

    // تحويل الرقم إلى تنسيق عراقي (مثلاً 7,500) وإضافة العملة
    return Number(digits).toLocaleString('en-US') + " د.ع";
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
        // داخل دالة updateCart
        cartItems.innerHTML = cart
            .map((item, index) => {
                total += item.price * item.qty;
                return `
      <div class="flex justify-between items-center border-b border-gray-100 pb-4 mb-4 gap-3">
          <div class="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
              <img src="${item.image}" class="w-full h-full object-contain p-1">
          </div>

          <div class="text-right flex-grow">
              <h4 class="text-xs font-bold text-zinc-900 mb-1">${item.name}</h4>
              <p class="text-[10px] text-gray-400">${globalFormatPrice(item.price)}</p>
          </div>

          <div class="flex items-center gap-2 bg-gray-50 p-1 rounded-lg">
              <button onclick="changeQty(${index}, 1)" class="w-6 h-6 bg-white shadow-sm rounded flex items-center justify-center text-zinc-800 font-bold">+</button>
              <span class="text-xs font-bold min-w-[15px] text-center">${item.qty}</span>
              <button onclick="changeQty(${index}, -1)" class="w-6 h-6 bg-white shadow-sm rounded flex items-center justify-center text-zinc-800 font-bold">-</button>
          </div>
      </div>`;
            })
            .join("");
    }

    const formattedTotal = globalFormatPrice(total);
    if (document.getElementById("cartTotal"))
        document.getElementById("cartTotal").innerText = formattedTotal;
}


function addToCart(name, price, imageUrl) {
    const numericPrice = parseInt(price.toString().replace(/[^\d]/g, '')) || 0;

    const item = cart.find((i) => i.name === name);
    if (item) {
        item.qty++;
    } else {
        // تخزين الاسم والسعر والصورة
        cart.push({
            name: name,
            price: numericPrice,
            qty: 1,
            image: imageUrl
        });
    }
    updateCart();
    renderPage(currentPage, false);
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
    renderPage(currentPage, false);
}

function changeQtyByName(name, delta) {
    const index = cart.findIndex((item) => item.name === name);
    if (index !== -1) {
        cart[index].qty += delta;
        if (cart[index].qty <= 0) cart.splice(index, 1);
    }
    updateCart();
    renderPage(currentPage, false);
}

// 5. عرض المنتجات (UI) مع خاصية الـ Flip
function renderPage(page, shouldScroll = true) {
    currentPage = page;
    if (shouldScroll) {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const grid = document.getElementById("productsGrid");
    if (!grid) return;

    const start = (page - 1) * itemsPerPage;
    const products = filteredProducts.slice(start, start + itemsPerPage);

    grid.innerHTML = products.map((product, index) => {
        const isOutOfStock = product["الحالة"] === "نفذت الكمية";
        // 1. تعريف الكلمات والألوان المرتبطة بها
        const badgeMap = {
            "الاعلى ربحاً": "badge-green",
            "الاكثر ربحاً": "badge-green",
            "الاكثر مبيعاً": "badge-green",
            "الاكثر طلباً": "badge-green",
            "الاسرع بيعاً": "badge-green",
            "موصى به": "badge-yellow",
            "عرض خاص": "badge-red",
            "قريب النفاذ": "badge-red",
            "كمية محدودة": "badge-red",
            "جديد الان": "badge-orange"
        };
        // 2. داخل دالة renderPage وتحديداً عند فحص الحالة (statusLabel)
        const statusLabel = (product["الحالة"] || "").trim();
        let badgeHTML = "";

        // إذا كانت الكلمة موجودة في القائمة، ارسم الليبل باللون المخصص لها
        if (badgeMap[statusLabel]) {
            const colorClass = badgeMap[statusLabel];
            badgeHTML = `<div class="product-badge ${colorClass}">${statusLabel}</div>`;
        }

        // 3. تأكد من وضع المتغير badgeHTML داخل الـ image-container كما فعلنا سابقاً
        const hasOffer = product["العرض"] && product["العرض"].toString().trim() !== "" && product["العرض"] !== "0";
        const rawPrice = product["السعر"]?.toString().replace(/[^\d]/g, '') || "0";
        const cartItem = cart.find((item) => item.name === product["اسم المنتج"]);
        const quantityInCart = cartItem ? cartItem.qty : 0;
        const productIndex = start + index;
        const productImage = fixImageUrl(product["الصورة"]);

        // --- التعديل هنا: إضافة كلاس الرمادي إذا كان المنتج نافذاً ---
        const imgStatusClass = isOutOfStock ? "out-of-stock-mode" : "";

        return `
        <div class="product-card-container">
            <div class="product-card-inner" id="card-${productIndex}">
                <div class="card-front overflow-hidden flex flex-col">
                  ${badgeHTML}
                <button onclick="event.stopPropagation(); document.getElementById('card-${productIndex}').classList.toggle('is-flipped')" 
                        class="absolute top-2 left-2 z-20 w-8 h-8 flex items-center justify-center">
                        <span class="material-icons-outlined hidden">autorenew</span>
                    </button>

                    <div class="image-container relative w-full cursor-pointer" onclick="openProductModal(${productIndex})">
                        
                        <div class="image-bg-blur" style="background-image: url('${productImage}')"></div>
                      
                        <img src="${productImage}" class="main-product-img ${imgStatusClass}" loading="lazy">
                        
                        ${isOutOfStock ? `<div class="out-of-stock-badge">نفذت الكمية</div>` : ""}
                    </div>
                    

                    <div class="p-4 text-right flex-grow flex flex-col">
                        <div class="flex items-start justify-between gap-2 mb-3 min-h-[40px]">
                            <div class="flex flex-col flex-grow">
                        <h3 class="font-bold text-slate-800 text-[14px] leading-tight cursor-pointer" onclick="openProductModal(${productIndex})">
                            ${product["اسم المنتج"]}
                        </h3>
                    </div>
                            
                            <div onclick="event.stopPropagation()">
                                ${quantityInCart === 0 ? `
                                    <button onclick="addToCart('${product["اسم المنتج"]}', '${rawPrice}', '${productImage}')" 
                                        class="w-10 h-10 bg-yellow-400 text-white rounded-xl flex items-center justify-center transition-all active:scale-90 ${isOutOfStock ? 'opacity-30 pointer-events-none' : ''}">
                                        <span class="material-icons-outlined text-[20px]">add_shopping_cart</span>
                                    </button>
                                ` : `
                                    <div class="w-30 h-10 flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                                        <button onclick="changeQtyByName('${product["اسم المنتج"]}', 1)" class="w-8 h-8 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-[12px] font-bold text-slate-700 transition-colors shadow-sm">+</button>
                                        <span class="text-[12px] font-black px-1 text-slate-800 self-center">${quantityInCart}</span>
                                        <button onclick="changeQtyByName('${product["اسم المنتج"]}', -1)" class="w-8 h-8 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center text-[12px] font-bold text-slate-700 transition-colors shadow-sm">-</button>
                                    </div>
                                `}
                            </div>
                        </div>
                        
                        <div class="mt-auto space-y-1 text-[13px]">
                            <div class="flex justify-between border-b border-gray-50 pb-0.5">
                                <span class="text-red-700 font-bold">السعر:</span>
                                <span class="text-red-700 font-bold">${globalFormatPrice(product["السعر"])}</span>
                            </div>
                            ${hasOffer ? `
                                <div class="sale flex justify-between border-b border-gray-50 pb-0.5">
                                    <span class="text-slate-700">العرض:</span>
                                    <span class="text-slate-700">${product["العرض"]}</span>
                                </div>
                                <div class="after-sale flex justify-between border-b border-gray-50 pb-0.5 animate-gentle-grow">
                                    <span class="text-green-700 font-bold">بعد العرض:</span>
                                    <span class="font-black text-green-700">${globalFormatPrice(product["السعر بعد العرض"])}</span>
                                </div>
                            ` : ''}
                            <div class="flex justify-between border-b border-gray-50 pb-0.5">
                                <span class="text-slate-700">سعر الرف:</span>
                                <span class="text-slate-700">${globalFormatPrice(product["سعر الرف"])}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card-back shadow-2xl rounded-3xl flex flex-col items-center justify-center p-6 bg-slate-900 text-white text-center" onclick="event.stopPropagation()">
                    <button onclick="event.stopPropagation(); document.getElementById('card-${productIndex}').classList.toggle('is-flipped')"
                        class="absolute top-4 left-4 text-white/50 hover:text-white transition-colors">
                        <span class="material-icons-outlined">close</span>
                    </button>
                    <span class="material-icons-outlined text-yellow-400 text-4xl mb-3">stars</span>
                    <h3 class="text-[13px] font-bold mb-2 uppercase tracking-[0.2em] text-yellow-500/80">سعر الجملة</h3>
                    <div class="bg-white/10 w-full py-3 rounded-2xl border border-white/20 mb-4">
                        <span class="text-2xl font-black text-white">${globalFormatPrice(product["سعر الجملة"])}</span>
                    </div>
                    <h3 class="text-[13px] font-bold mb-2 uppercase tracking-[0.2em] text-yellow-500/80">عدد الجملة</h3>
                    <div class="bg-white/10 w-full py-3 rounded-2xl border border-white/20 mb-4">
                        <span class="text-2xl font-black text-white">${product["عدد الجملة"]}</span>
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
            class="category-btn transition-transform active:scale-95 
            ${currentCategory === cat
                    ? "active text-white shadow-lg shadow-slate-300 transform scale-105"
                    : "text-slate-500 hover:text-slate-700 hover:shadow-md"
                }">
            ${cat}
        </button>`
        )
        .join("");
}
function setCategory(cat) {
    currentCategory = cat;
    createCategoryButtons(); // لإعادة رسم الأزرار وتغيير اللون الأخضر للزر المختار
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
    if (container) {
        container.innerHTML = ""; // مسح الأزرار تماماً
    }
}

function changePage(newPage) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
        renderPage(newPage, true);
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

    const hasOffer = product["العرض"] && product["العرض"] !== "0";
    const getRaw = (val) => val ? val.toString().split('.')[0].replace(/[^\d]/g, '') : "0";
    const cartItem = cart.find((item) => item.name === product["اسم المنتج"]);
    const quantityInCart = cartItem ? cartItem.qty : 0;
    const isOutOfStock = product["الحالة"] === "نفذت الكمية";

    // جلب السعر النهائي (إذا كان هناك عرض نأخذ سعر العرض، وإلا السعر العادي)
    const finalPrice = hasOffer ? getRaw(product["السعر بعد العرض"]) : getRaw(product["السعر"]);
    const piecesCount = parseInt(product["العدد"]) || 1;

    const modalImgClass = isOutOfStock ? "out-of-stock-mode" : "";

    content.style.maxWidth = "450px";
    content.style.width = "90%";
    content.className = "bg-white rounded-[35px] overflow-hidden shadow-2xl transform transition-all duration-300";

    body.innerHTML = `
        <div class="flex flex-col">
            <div class="relative w-full h-80 bg-gray-50 flex items-center justify-center border-b border-gray-100 overflow-hidden">
                <div class="image-bg-blur" style="background-image: url('${fixImageUrl(product["الصورة"])}')"></div>
                <img src="${fixImageUrl(product["الصورة"])}" class="relative z-10 w-full h-full object-contain p-6 ${modalImgClass}">
                <button onclick="closeProductModal()" class="absolute top-4 right-4 bg-white/90 w-10 h-10 rounded-full flex items-center justify-center shadow-md z-30">
                    <span class="material-icons-outlined text-gray-600">close</span>
                </button>
                ${isOutOfStock ? `<div class="out-of-stock-badge">نفذت الكمية</div>` : ""}
            </div>

            <div class="p-6 text-right">
                <h2 class="text-xl font-black text-slate-800 mb-4">${product["اسم المنتج"]}</h2>

                <div class="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
                    <div class="flex justify-between items-center">
                        <span class="text-red-700 font-bold text-sm">السعر</span>
                        <span class="text-red-700 text-lg">${globalFormatPrice(product["السعر"])}</span>
                    </div>
                    ${hasOffer ? `
                        <div class="sale flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                            <span class="text-slate-800 font-bold text-sm">العرض</span>
                            <span class="text-slate-800 text-xl">${product["العرض"]}</span>
                        </div>
                        <div class="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 animate-gentle-grow">
                            <span class="text-green-700 font-bold text-sm"> بعد العرض</span>
                            <span class="text-green-700 text-xl">${globalFormatPrice(product["السعر بعد العرض"])}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="grid grid-cols-2 gap-3 mb-6">
                    <div class="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex flex-col items-center">
                        <span class="text-blue-600 text-[10px] font-bold">سعر الرف</span>
                        <span class="text-blue-700 font-black">${globalFormatPrice(product["سعر الرف"])}</span>
                    </div>
                    <div class="bg-orange-50/50 p-3 rounded-xl border border-orange-100 flex flex-col items-center">
                        <span class="text-orange-600 text-[10px] font-bold">العدد</span>
                        <span class="text-orange-700 font-black">${product["العدد"] || "---"}</span>
                    </div>
                </div>

                <div class="flex gap-3 mt-6">
                    <div class="flex-1">
                        ${quantityInCart === 0 ? `
                            <button onclick="addToCart('${product["اسم المنتج"]}', '${getRaw(product["السعر"])}'); openProductModal(${index})" 
                                class="w-full h-14 bg-yellow-400 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform ${isOutOfStock ? 'opacity-30 pointer-events-none' : ''}">
                                <span class="material-icons-outlined">add_shopping_cart</span>
                                إضافة
                            </button>
                        ` : `
                            <div class="flex items-center justify-between w-full bg-yellow-200 p-2 rounded-2xl border border-gray-200 h-14">
                                <button onclick="changeQtyByName('${product["اسم المنتج"]}', 1); openProductModal(${index})" class="w-10 h-10 bg-gray-100 rounded-xl shadow-sm font-bold text-xl">+</button>
                                <span class="text-lg font-black">${quantityInCart}</span>
                                <button onclick="changeQtyByName('${product["اسم المنتج"]}', -1); openProductModal(${index})" class="w-10 h-10 bg-gray-100 rounded-xl shadow-sm font-bold text-xl">-</button>
                            </div>
                        `}
                    </div>
                    
                    <button onclick="startProfitCalc(${index})" 
    class="flex-1 w-full h-14 bg-green-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
    <span class="material-icons-outlined">calculate</span>
    <span class="font-bold">حاسبة الأرباح</span>
</button>
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
// ميزة الإغلاق عند النقر خارج النافذة
window.addEventListener('click', function (event) {
    const modal = document.getElementById('productModal');
    const modalContent = document.getElementById('modalContent');

    // إذا كان المودال مفتوحاً (ليس مخفياً) وكان النقر على المودال نفسه (الخلفية) وليس المحتوى
    if (event.target === modal) {
        closeProductModal();
    }
});
// احذفي كل هذا الجزء من البداية للنهاية
const slider = document.getElementById('categoryBar');
let isDown = false;
let startX;
let scrollLeft;

if (slider) {
    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.style.cursor = 'grabbing';
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
        slider.style.scrollBehavior = 'auto';
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.style.cursor = 'grab';
    });

    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.style.cursor = 'grab';
        slider.style.scrollBehavior = 'smooth';
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 1.5;
        slider.scrollLeft = scrollLeft - walk;
    });
}
function startProfitCalc(productIndex) {
    const product = filteredProducts[productIndex];

    // تأكد من جلب العناصر من الـ HTML
    const modal = document.getElementById('profitModal');
    const content = document.getElementById('profitContent');
    const input = document.getElementById('userSellPrice');
    const calcBtn = document.getElementById('calcBtn');
    const resultDiv = document.getElementById('profitResult');
    const calcActionButtons = document.getElementById('calcActionButtons');
    const addToCartBtn = document.getElementById('addToCartFromCalc');

    const shelfPriceRaw = product["سعر الرف"] ? product["سعر الرف"].toString().replace(/[^\d]/g, '') : "";
    input.value = shelfPriceRaw;
    resultDiv.classList.add('hidden');
    calcActionButtons.classList.remove('hidden');
    modal.classList.remove('hidden');

    setTimeout(() => {
        content.classList.replace('scale-95', 'scale-100');
        content.classList.replace('opacity-0', 'opacity-100');
    }, 10);

    // 2. كود زر "احسب الآن"
    calcBtn.onclick = function () {
        const sellPrice = parseFloat(input.value);
        if (!sellPrice || sellPrice <= 0) {
            alert("يرجى إدخال سعر البيع أولاً");
            return;
        }

        // جلب البيانات من المنتج المختار
        const pieces = parseInt(product["العدد"]) || 1;
        const mainPrice = parseFloat(product["السعر"]) || 0;
        const offerPrice = parseFloat(product["السعر بعد العرض"]) || mainPrice;

        // تطبيق المعادلات
        const pBefore = (sellPrice * pieces) - mainPrice;
        const pAfter = (sellPrice * pieces) - offerPrice;

        document.getElementById('profitBeforeOffer').innerText = Math.round(pBefore).toLocaleString() + " د.ع";
        document.getElementById('profitAfterOffer').innerText = Math.round(pAfter).toLocaleString() + " د.ع";

        // --- التعديل هنا لضمان الإخفاء الذكي ---
        // نبحث عن الحاوية (السطر) التي تحتوي على "الربح بعد العرض"
        const afterOfferRow = document.getElementById('profitAfterOffer').closest('div');

        // نعطي هذا السطر كلاس خاص لكي يتحكم به الـ CSS
        if (afterOfferRow) {
            afterOfferRow.classList.add('profit-after-offer-row');
        }

        // إظهار النتائج
        resultDiv.classList.remove('hidden');
        calcActionButtons.classList.add('hidden');
    };

    // 3. كود الإضافة للسلة من داخل الحاسبة
    addToCartBtn.onclick = function () {
        addToCart(product["اسم المنتج"], product["السعر"], fixImageUrl(product["الصورة"]));
        closeProfitModal();
    };

    // 4. إخفاء النتائج إذا قام المستخدم بتعديل السعر (نقطة 6 في المخطط)
    input.oninput = function () {
        resultDiv.classList.add('hidden');
        calcActionButtons.classList.remove('hidden');
    };
}

function closeProfitModal() {
    const modal = document.getElementById('profitModal');
    const content = document.getElementById('profitContent');
    content.classList.replace('scale-100', 'scale-95');
    content.classList.replace('opacity-100', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}
function applyNoShameMode() {
    const isChecked = document.getElementById('noShameToggle').checked;
    const body = document.body;
    const profitLabel = document.getElementById('profitLabel');

    if (isChecked) {
        body.classList.add('no-shame-active');
        localStorage.setItem('noShameStatus', 'enabled');

        // تغيير النص عند تفعيل وضع الزبون
        if (profitLabel) profitLabel.innerText = "ربح الكرتون:";
    } else {
        body.classList.remove('no-shame-active');
        localStorage.setItem('noShameStatus', 'disabled');

        // إعادة النص الأصلي عند إيقاف الوضع
        if (profitLabel) profitLabel.innerText = "ربح الكرتون | قبل العرض:";
    }
}
// إظهار وإخفاء زر العودة للأعلى عند التمرير
window.onscroll = function() {
    const btn = document.getElementById("backToTop");
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        btn.classList.remove("opacity-0", "invisible");
        btn.classList.add("opacity-100", "visible");
    } else {
        btn.classList.add("opacity-0", "invisible");
        btn.classList.remove("opacity-100", "visible");
    }
};

// وظيفة الزر عند الضغط
document.getElementById("backToTop").onclick = function() {
    window.scrollTo({ top: 0, behavior: "smooth" });
};
