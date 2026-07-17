// CLOUDINARY PERMANENT DIRECT CONFIGURATION
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dqo0bc4u/image/upload";
const CLOUDINARY_PRESET = "hetpqj8w";

let cart = JSON.parse(localStorage.getItem('digitera_cart')) || [];
let products = JSON.parse(localStorage.getItem('digitera_products')) || [];
let selectedFiles = [];

// INITIALIZE SHOP DATA ON LOAD
document.addEventListener("DOMContentLoaded", () => {
    renderShopProducts();
    updateCartUI();
});

// 🌟 IMAGE SELECTION WITH RENDER TO MAX 10 IMAGES
function handleImageSelection() {
    const fileInput = document.getElementById("adminImages");
    const previewContainer = document.getElementById("uploadPreview");
    
    // Suportahan ang hanggang 10 images limit check
    if (fileInput.files.length > 10) {
        alert("Maximum na 10 mga larawan lamang ang maaaring i-upload kada produkto.");
        fileInput.value = "";
        return;
    }

    selectedFiles = Array.from(fileInput.files);
    if (selectedFiles.length > 0) {
        previewContainer.innerHTML = `Selected ${selectedFiles.length} images ready for Cloudinary upload.`;
    } else {
        previewContainer.innerHTML = "No images selected yet (Max 10).";
    }
}

// 🌟 SAVE PRODUCT INCORPORATING CLOUDINARY LOOP AND ACCESS LINKS
async function saveAdminProduct() {
    const name = document.getElementById("adminName").value;
    const price = parseFloat(document.getElementById("adminPrice").value);
    const shortDesc = document.getElementById("adminShortDesc").value;
    const salesCopy = document.getElementById("adminSalesCopy").value;
    const accessLink = document.getElementById("adminAccessLink").value; // Kinuha ang Drive/Canva box value

    if (!name || isNaN(price) || !shortDesc || !salesCopy || !accessLink) {
        alert("Paki-kumpleto ang lahat ng text fields kabilang ang Secure Access Link!");
        return;
    }

    let uploadedImageUrls = [];
    
    // Loop para i-upload ang bawat file nang direkta sa Cloudinary
    if (selectedFiles.length > 0) {
        alert(`Uploading ${selectedFiles.length} images to Cloudinary... Please wait.`);
        for (let file of selectedFiles) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", CLOUDINARY_PRESET);

            try {
                const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
                const fileData = await res.json();
                if (fileData.secure_url) {
                    uploadedImageUrls.push(fileData.secure_url);
                }
            } catch (err) {
                console.error("Cloudinary upload issue:", err);
            }
        }
    }

    // Bagong product model object
    const newProduct = {
        id: "prod_" + Date.now(),
        name,
        price,
        shortDesc,
        salesCopy,
        accessLink, // Naka-store nang ligtas sa product memory database
        images: uploadedImageUrls.length > 0 ? uploadedImageUrls : ["https://via.placeholder.com/300"]
    };

    products.push(newProduct);
    localStorage.setItem('digitera_products', JSON.stringify(products));
    
    alert("Success! Digital product deployed horizontally with custom visuals.");
    closeModal('adminModal');
    
    // Clear form layout variables
    document.getElementById("adminName").value = "";
    document.getElementById("adminPrice").value = "";
    document.getElementById("adminShortDesc").value = "";
    document.getElementById("adminSalesCopy").value = "";
    document.getElementById("adminAccessLink").value = "";
    selectedFiles = [];
    document.getElementById("uploadPreview").innerHTML = "No images selected yet (Max 10).";

    renderShopProducts();
}

// RENDER PRODUCTS GRID HORIZONTALLY
function renderShopProducts() {
    const grid = document.getElementById("shopProductsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    if (products.length === 0) {
        grid.innerHTML = `<p style="text-align:center; color:#888; width:100%;">No assets active in your store. Use Admin Area to publish.</p>`;
        return;
    }

    products.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.onclick = (e) => {
            if (!e.target.classList.contains('add-to-cart-btn')) openProductModal(p.id);
        };
        
        card.innerHTML = `
            <img src="${p.images[0]}" class="product-thumbnail" alt="${p.name}">
            <h3>${p.name}</h3>
            <p class="short-desc">${p.shortDesc}</p>
            <div class="product-price">₱${p.price.toFixed(2)}</div>
            <button class="add-to-cart-btn" onclick="addToCart(event, '${p.id}')">Add to Cart</button>
        `;
        grid.appendChild(card);
    });
}

// OPEN DYNAMIC MODAL GALLERY SYSTEM
function openProductModal(productId) {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    document.getElementById("modalTitle").innerText = p.name;
    document.getElementById("modalPrice").innerText = `₱${p.price.toFixed(2)}`;
    document.getElementById("modalSalesCopy").innerText = p.salesCopy;

    const mainImg = document.getElementById("modalMainImg");
    mainImg.src = p.images[0];

    const thumbsRow = document.getElementById("modalThumbsRow");
    thumbsRow.innerHTML = "";

    // Gumawa ng clickable thumbnails kung higit sa isa ang images
    p.images.forEach((imgUrl, index) => {
        const thumb = document.createElement("img");
        thumb.src = imgUrl;
        thumb.className = `thumb-nav ${index === 0 ? 'active' : ''}`;
        thumb.onclick = () => {
            mainImg.src = imgUrl;
            document.querySelectorAll(".thumb-nav").forEach(t => t.classList.remove("active"));
            thumb.classList.add("active");
        };
        thumbsRow.appendChild(thumb);
    });

    const cartBtn = document.getElementById("modalAddToCartBtn");
    cartBtn.onclick = (e) => addToCart(e, p.id);

    openModal("productDetailModal");
}

// CART CORE FUNCTIONALITIES
function addToCart(e, productId) {
    if (e) e.stopPropagation();
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id: p.id, name: p.name, price: p.price, quantity: 1, checked: true });
    }
    saveAndSyncCart();
}

function saveAndSyncCart() {
    localStorage.setItem('digitera_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const countSpan = document.getElementById("cart-count");
    const itemsList = document.getElementById("cartItems");
    const totalSpan = document.getElementById("cartTotal");

    if (!countSpan || !itemsList || !totalSpan) return;

    let totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    countSpan.innerText = totalCount;

    itemsList.innerHTML = "";
    let grandTotal = 0;

    cart.forEach((item, index) => {
        if (item.checked) grandTotal += (item.price * item.quantity);

        const row = document.createElement("div");
        row.style = "display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size:14px;";
        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleItemCheck(${index})">
                <div>
                    <strong>${item.name}</strong><br>
                    <span style="color:#888;">₱${item.price} x ${item.quantity}</span>
                </div>
            </div>
            <button onclick="removeFromCart(${index})" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
        `;
        itemsList.appendChild(row);
    });

    totalSpan.innerText = grandTotal.toFixed(2);
}

function toggleItemCheck(index) {
    cart[index].checked = !cart[index].checked;
    saveAndSyncCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveAndSyncCart();
}

function toggleCart(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById("cartModal");
    modal.classList.toggle("open");
}

// PROCESS CHECKOUT ENGINE FOR P1.00 TEST SETUP
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
                redirect_url: window.location.origin + '/success.html', 
                items: checkedItems.map(item => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                }))
            })
        });

        const data = await response.json();
        if (data.checkout_url) {
            window.location.href = data.checkout_url;
        } else {
            alert("Error sa payment session: " + JSON.stringify(data.error));
        }
    } catch (error) {
        alert("Hindi makakonekta sa iyong server: " + error.message);
    }
}
