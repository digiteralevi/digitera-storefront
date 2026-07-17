// ==========================================
// CONFIGURATION (PASTILAN NG IYONG MGA SUSI)
// ==========================================
const CLOUDINARY_PRESET = "hetpqj8w"; 
const CLOUDINARY_CLOUD_NAME = "dqo0bc4u"; 

// I-paste dito ang iyong Firebase Config mula sa Firebase Console kapag handa na ang database
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ==========================================
// INITIALIZATION & VARIABLES
// ==========================================
let shopProducts = [];
let cart = JSON.parse(localStorage.getItem('digitera_cart')) || [];
let selectedImagesBase64 = [];

// 📁 HANDLE IMAGE SELECTION (LOCAL PREVIEW)
function handleImageSelection() {
    const fileInput = document.getElementById('adminImages');
    const previewDiv = document.getElementById('uploadPreview');
    const files = Array.from(fileInput.files).slice(0, 5); // Limit hanggang 5 images
    
    selectedImagesBase64 = [];
    previewDiv.innerHTML = "";

    if (files.length === 0) {
        previewDiv.innerHTML = "No images selected yet (Max 5).";
        return;
    }

    files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImagesBase64.push(e.target.result);
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = "50px";
            img.style.height = "50px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "4px";
            previewDiv.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

// ☁️ UPLOAD TO CLOUDINARY (FREE TIER)
async function uploadToCloudinary(base64Str) {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append('file', base64Str);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    try {
        const res = await fetch(url, { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url; // Permanenteng URL link mula sa Cloudinary
    } catch (err) {
        console.error("Cloudinary Upload Error:", err);
        return "";
    }
}

// ⚙️ SAVE PRODUCT TO CLOUD DATABASE (ADMIN FUNCTION)
async function saveAdminProduct() {
    const name = document.getElementById('adminName').value.trim();
    const price = parseFloat(document.getElementById('adminPrice').value);
    const shortDesc = document.getElementById('adminShortDesc').value.trim();
    const salesCopy = document.getElementById('adminSalesCopy').value.trim();

    if (!name || !price || !shortDesc || selectedImagesBase64.length === 0) {
        alert("Paki-kumpleto ang pangalan, presyo, short description, at mag-upload ng kahit 1 image!");
        return;
    }

    alert("Ina-upload ang mga images sa Cloudinary at sine-save ang produkto. Sandali lang...");

    // Awtomatikong ina-upload ang lahat ng pictures na pinili mo sa device mo
    const imageUrls = await Promise.all(selectedImagesBase64.map(base64 => uploadToCloudinary(base64)));
    const validImageUrls = imageUrls.filter(url => url !== "");

    const newProduct = {
        id: 'prod_' + Date.now(),
        name,
        price,
        shortDesc,
        salesCopy,
        images: validImageUrls
    };

    // Imbak sa LocalStorage muna bilang backup bago i-sync sa Firebase Firestore
    let localProds = JSON.parse(localStorage.getItem('digitera_cloud_products')) || [];
    localProds.push(newProduct);
    localStorage.setItem('digitera_cloud_products', JSON.stringify(localProds));

    alert("Success! Published successfully to your Digital Shop.");
    closeModal('adminModal');
    location.reload();
}

// 🛒 DISPLAY PRODUCTS TO STOREFRONT
function renderStorefront() {
    const grid = document.getElementById('shopProductsGrid');
    const savedProds = JSON.parse(localStorage.getItem('digitera_cloud_products')) || [];
    
    // Default fallback starter items habang wala ka pang ina-add
    const defaultProds = [
        { id: 'fc_01', name: 'FunnelCraft App Kit', price: 499, shortDesc: 'Complete direct storefront sequence.', salesCopy: 'High converting sales copy sample text...', images: ['https://via.placeholder.com/300'] },
        { id: 'bp_02', name: 'Digital Business Planner', price: 250, shortDesc: 'Fully customizable planners.', salesCopy: 'Aesthetic layout optimization tools...', images: ['https://via.placeholder.com/300'] }
    ];

    shopProducts = savedProds.length > 0 ? savedProds : defaultProds;
    grid.innerHTML = "";

    shopProducts.forEach(prod => {
        const card = document.createElement('div');
        card.className = "product-card";
        card.onclick = () => openProductDetails(prod.id);
        
        card.innerHTML = `
            <img src="${prod.images[0]}" class="product-thumbnail" alt="${prod.name}">
            <h3>${prod.name}</h3>
            <p class="short-desc">${prod.shortDesc}</p>
            <div class="product-price">₱${prod.price.toFixed(2)}</div>
            <button class="add-to-cart-btn" onclick="handleAddToCartClick(event, '${prod.id}')">Add to Cart</button>
        `;
        grid.appendChild(card);
    });
}

function handleAddToCartClick(e, id) {
    e.stopPropagation(); // Pinipigilan nitong mag-pop up ang sales copy kapag button lang ang pinindot
    const prod = shopProducts.find(p => p.id === id);
    addToCart(prod.name, prod.price, prod.images[0]);
}

// 🔍 OPEN DETAILED SALES COPY MODAL WITH MULTI-IMAGE GALLERY
function openProductDetails(id) {
    const prod = shopProducts.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('modalTitle').innerText = prod.name;
    document.getElementById('modalPrice').innerText = `₱${prod.price.toFixed(2)}`;
    document.getElementById('modalSalesCopy').innerText = prod.salesCopy;
    
    const mainImg = document.getElementById('modalMainImg');
    mainImg.src = prod.images[0];

    const thumbsRow = document.getElementById('modalThumbsRow');
    thumbsRow.innerHTML = "";

    prod.images.forEach((imgUrl, idx) => {
        const thumb = document.createElement('img');
        thumb.src = imgUrl;
        thumb.className = `thumb-nav ${idx === 0 ? 'active' : ''}`;
        thumb.onclick = () => {
            document.querySelectorAll('.thumb-nav').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            mainImg.src = imgUrl;
        };
        thumbsRow.appendChild(thumb);
    });

    document.getElementById('modalAddToCartBtn').onclick = () => addToCart(prod.name, prod.price, prod.images[0]);
    document.getElementById('productDetailModal').style.display = 'flex';
}

// 🛒 SHOPEE STYLE SHOPPING CART LOGIC
function addToCart(name, price, img) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ name, price, img, quantity: 1, checked: true });
    }
    updateCartUI();
    document.getElementById('cartModal').classList.add('open');
}

function updateCartUI() {
    localStorage.setItem('digitera_cart', JSON.stringify(cart));
    document.getElementById('cart-count').innerText = cart.reduce((sum, i) => sum + i.quantity, 0);

    const list = document.getElementById('cartItems');
    list.innerHTML = "";
    let grandTotal = 0;

    cart.forEach((item, index) => {
        if (item.checked) {
            grandTotal += item.price * item.quantity;
        }

        const div = document.createElement('div');
        div.className = "cart-item";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "space-between";
        div.style.marginBottom = "10px";

        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleItemCheck(${index})" style="cursor:pointer; transform: scale(1.2);">
                <img src="${item.img}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                <div>
                    <div style="font-weight:bold; font-size:14px;">${item.name}</div>
                    <div style="font-size:12px; color:#666;">₱${item.price} x ${item.quantity}</div>
                </div>
            </div>
            <button onclick="removeFromCart(${index})" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
        `;
        list.appendChild(div);
    });

    document.getElementById('cartTotal').innerText = grandTotal.toFixed(2);
}

function toggleItemCheck(index) {
    cart[index].checked = !cart[index].checked; // Re-compute base lang sa may tsek
    updateCartUI(); 
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function toggleCart(e) {
    if(e) e.stopPropagation();
    document.getElementById('cartModal').classList.toggle('open');
}

// 🚀 PROCESS CHECKOUT TO PAYMONGO VIA VERCEL BACKEND
async function processCheckout() {
    const checkedItems = cart.filter(item => item.checked);
    
    if (checkedItems.length === 0) {
        alert("Pumili muna ng kahit isang produkto na may CHECK sa iyong cart para makapag-checkout!");
        return;
    }

    try {
     const response = await fetch('https://digitera-shop-backend.vercel.app/api/cart-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                redirect_url: 'https://digitera-shop-backend.vercel.app/api/cart-checkout',
                items: checkedItems.map(item => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                }))
            })
        });

        const data = await response.json();
        if (data.checkout_url) {
            window.location.href = data.checkout_url; // Redirect sa safe checkout gateway ni Paymongo
        } else {
            alert("Error sa payment session: " + JSON.stringify(data.error));
        }
    } catch (error) {
        alert("Hindi makakonekta sa iyong server: " + error.message);
    }
}

// ON LAUNCH RUNNERS
window.onload = () => {
    renderStorefront();
    updateCartUI();
};
