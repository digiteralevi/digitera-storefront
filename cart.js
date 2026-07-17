// CLOUDINARY DIRECT CONFIGURATION
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dqo0bc4u/image/upload";
const CLOUDINARY_PRESET = "hetpqj8w";

// FIREBASE GLOBAL INITIALIZATION CONTEXT
const firebaseConfig = {
    apiKey: "AIzaSyDFQcwCJxIkTX0CCz8kaF7Sp2_hZNE1dIs",
    authDomain: "digitera-levi-shop.firebaseapp.com",
    projectId: "digitera-levi-shop",
    storageBucket: "digitera-levi-shop.firebasestorage.app",
    messagingSenderId: "63166329156",
    appId: "1:63166329156:web:0b797f9438a98c84e46711",
    measurementId: "G-NX45XW9X8Q"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let cart = JSON.parse(localStorage.getItem('digitera_cart')) || [];
let products = [];
let selectedFiles = [];
let isAdminMode = false;

document.addEventListener("DOMContentLoaded", () => {
    checkAdminMode(); // Tinitingnan kung may secret URL extension
    fetchCloudProducts();
    updateCartUI();
});

// 🛡️ SECRET URL EXTENSION CHECKER
function checkAdminMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'admin') {
        isAdminMode = true;
        document.getElementById("secretAdminBtn").style.display = "block"; // Lumalabas lang ang floating icon sa admin
    }
}

function fetchCloudProducts() {
    db.collection("products").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        renderShopProducts();
    });
}

function handleImageSelection() {
    const fileInput = document.getElementById("adminImages");
    const previewContainer = document.getElementById("uploadPreview");
    
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

// 🌟 SAVE & UPDATE FUNCTIONS INTEGRATED
async function saveAdminProduct() {
    const productId = document.getElementById("adminEditProductId").value;
    const name = document.getElementById("adminName").value;
    const price = parseFloat(document.getElementById("adminPrice").value);
    const shortDesc = document.getElementById("adminShortDesc").value;
    const salesCopy = document.getElementById("adminSalesCopy").value;
    const accessLink = document.getElementById("adminAccessLink").value;

    if (!name || isNaN(price) || !shortDesc || !salesCopy || !accessLink) {
        alert("Paki-kumpleto ang lahat ng text fields kabilang ang Secure Access Link!");
        return;
    }

    let uploadedImageUrls = [];
    
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

    const productData = {
        name,
        price,
        shortDesc,
        salesCopy,
        accessLink
    };

    try {
        if (productId) {
            // ✏️ UPDATE LOGIC
            if (uploadedImageUrls.length > 0) {
                productData.images = uploadedImageUrls;
            }
            await db.collection("products").doc(productId).update(productData);
            alert("Success! Product successfully updated in the Cloud Database.");
        } else {
            // ➕ CREATE LOGIC
            productData.images = uploadedImageUrls.length > 0 ? uploadedImageUrls : ["https://via.placeholder.com/300"];
            productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("products").add(productData);
            alert("Success! Product successfully published to the Cloud Database.");
        }
        
        closeModal('adminModal');
        resetAdminForm();
    } catch (error) {
        alert("Error handling cloud database action: " + error.message);
    }
}

// ✏️ PRE-FILL FORM FOR EDITING
function editProduct(productId, event) {
    if (event) event.stopPropagation();
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    document.getElementById("adminModalTitle").innerText = "Edit Digital Asset";
    document.getElementById("adminSubmitBtn").innerText = "Update Product";
    document.getElementById("adminEditProductId").value = p.id;
    document.getElementById("adminName").value = p.name;
    document.getElementById("adminPrice").value = p.price;
    document.getElementById("adminShortDesc").value = p.shortDesc;
    document.getElementById("adminSalesCopy").value = p.salesCopy;
    document.getElementById("adminAccessLink").value = p.accessLink;
    
    document.getElementById("editImageNotice").style.display = "block";
    openModal('adminModal');
}

// 🗑️ DELETE FUNCTION FROM FIREBASE
async function deleteProduct(productId, event) {
    if (event) event.stopPropagation();
    if (!confirm("Sigurado ka bang gusto mong burahin ang produktong ito nang permanente sa cloud?")) return;

    try {
        await db.collection("products").doc(productId).delete();
        alert("Product successfully deleted from cloud database.");
    } catch (error) {
        alert("Error deleting product: " + error.message);
    }
}

function resetAdminForm() {
    document.getElementById("adminModalTitle").innerText = "Add New Digital Asset";
    document.getElementById("adminSubmitBtn").innerText = "Create & Publish Product";
    document.getElementById("adminEditProductId").value = "";
    document.getElementById("adminName").value = "";
    document.getElementById("adminPrice").value = "";
    document.getElementById("adminShortDesc").value = "";
    document.getElementById("adminSalesCopy").value = "";
    document.getElementById("adminAccessLink").value = "";
    document.getElementById("editImageNotice").style.display = "none";
    selectedFiles = [];
    document.getElementById("uploadPreview").innerHTML = "No images selected yet (Max 10).";
}

function renderShopProducts() {
    const grid = document.getElementById("shopProductsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    if (products.length === 0) {
        grid.innerHTML = `<p style="text-align:center; color:#888; width:100%;">No assets active in your store.</p>`;
        return;
    }

    products.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.onclick = (e) => {
            if (!e.target.classList.contains('add-to-cart-btn') && 
                !e.target.classList.contains('edit-card-btn') && 
                !e.target.classList.contains('delete-card-btn')) {
                openProductModal(p.id);
            }
        };
        
        let adminButtonsHTML = "";
        // Kung ikaw ay nasa secret admin mode, lalabas ang Edit at Delete buttons sa mismong card box
        if (isAdminMode) {
            adminButtonsHTML = `
                <div class="admin-card-actions">
                    <button class="edit-card-btn" onclick="editProduct('${p.id}', event)">✏️ Edit</button>
                    <button class="delete-card-btn" onclick="deleteProduct('${p.id}', event)">🗑️</button>
                </div>
            `;
        }
        
        card.innerHTML = `
            <img src="${p.images[0]}" class="product-thumbnail" alt="${p.name}">
            <h3>${p.name}</h3>
            <p class="short-desc">${p.shortDesc}</p>
            <div class="product-price">₱${p.price.toFixed(2)}</div>
            <button class="add-to-cart-btn" onclick="addToCart(event, '${p.id}')">Add to Cart</button>
            ${adminButtonsHTML}
        `;
        grid.appendChild(card);
    });
}

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

// (Nananatili ang parehong UI at checkout logic para sa Paymongo)
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

async function processCheckout() {
    const checkedItems = cart.filter(item => item.checked);
    if (checkedItems.length === 0) {
        alert("Pumili muna ng kahit isang produkto na may CHECK sa iyong cart para makapag-checkout!");
        return;
    }
    try {
        const response = await fetch('https://digitera-levi-shop-backend.vercel.app/api/cart-checkout', { {
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
