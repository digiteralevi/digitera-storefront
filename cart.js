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

// MODALS AND UI MANAGEMENT
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "block";
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "none";
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

// 🛍️ UPDATED PROCESS CHECKOUT WITH EMAIL PROMPT BOX
async function processCheckout() {
    const checkedItems = cart.filter(item => item.checked);
    if (checkedItems.length === 0) {
        alert("Pumili muna ng kahit isang produkto na may CHECK sa iyong cart para makapag-checkout!");
        return;
    }

    const buyerEmail = prompt("Saan namin ipadadala ang iyong digital products? Pakisulat ang iyong active Email Address:");
    
    if (!buyerEmail) {
        alert("Kailangan mo pong ilagay ang iyong Email Address para matanggap ang iyong produkto.");
        return;
    }

    if (!buyerEmail.includes("@") || !buyerEmail.includes(".")) {
        alert("Paki-check po ang iyong email. Siguraduhing tama at may '@' at '.' (e.g., sample@gmail.com)");
        return;
    }

    localStorage.setItem("buyer_email", buyerEmail);

    try {
        const response = await fetch('https://digitera-shop-backend.vercel.app/api/cart-checkout.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                redirect_url: window.location.origin + '/success.html', 
                email: buyerEmail,
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

// ==========================================
// DIGITERA HIGH-CONVERTING FUNNEL AUTOMATIONS
// ==========================================

const reviews = [
    { name: "Angela M.", tag: "Verified Creator", text: "Highly recommended, very helpful and accommodating talaga! Sobrang haba ng pasensya magturo sa katulad kong beginner na walang alam sa digital products. Di kayo magsisisi sa templates niya, easy transaction pa!" },
    { name: "Mark Santos", tag: "Side Hustler", text: "Sulit na sulit yung ROI Framework Vault! Akala ko mahihirapan ako mag-set up pero sobrang daling sundan. Yung mga Canva templates ang ganda ng aesthetic, hindi mukhang chipipay." },
    { name: "Coach Jayson", tag: "Course Creator", text: "Sobrang game changer nung Aesthetic Workbook bundle po. Ginamit ko agad para sa lead magnet ko at ang daming nag-enrol. 10 stars para sa seller!" },
    { name: "Trisha Cruz", tag: "Digital Marketer", text: "Sobrang instant ng access tapos ready to resell talaga. Ang laking tipid sa oras kesa gumawa ako from scratch. Best investment for my online shop this year." },
    { name: "Dave_Digital", tag: "Verified Reseller", text: "Legit guys, ang bilis kausap ni admin at guided talaga. Yung Reels Vault gamit na gamit ko ngayon para sa faceless marketing account ko. Super low price para sa quality." },
    { name: "Mommy Elaine", tag: "Home Preneur", text: "Nagustuhan ng anak ko yung Kids Whys Flipbook, dinownload ko agad at pinrint. Sobrang worth it nung package may kasama pang educational freebies." },
    { name: "Kevin R.", tag: "Funnel Designer", text: "Ganda ng lines ng Funnelcraft at active lahat ng links. Hindi ka mahihirapan mag-scale. Highly accommodating din si boss sa inquiries." },
    { name: "Nica Rivera", tag: "E-book Publisher", text: "Ang daming choices sa 3Million E-Books bundle! Dynamic at responsive ang catalog. Perfect para sa mga gustong magsimula ng digital business na maliit ang puhunan." },
    { name: "Reynald_99", tag: "Store Owner", text: "Fast delivery of assets at ang lilinis ng codes nung mga apps and mini games. Napaka-smooth gamitin sa site ko. Thank you so much po!" },
    { name: "Chadi F.", tag: "Social Media Manager", text: "Yung Dental at Real Estate templates ang nagligtas sa mga clients ko ngayong linggo. Super aesthetic ng layouts at edit ready na agad sa Canva. Super thumbs up!" }
];

const buyerNames = ["Maria", "John", "Sarah", "Dave", "Kylie", "Mark", "Princess", "James", "Rowena", "Alvin"];
const buyerLocations = ["Manila", "Cebu", "Davao", "Quezon City", "Ilocos Norte", "Pampanga", "Cavite", "Bulacan", "Laguna", "Baguio"];
const trendingProducts = [
    "KIDZCREATOR SYSTEM",
    "Digital Product ROI Framework Vault",
    "$1.99 System Kit",
    "DENTAL Social Media Marketing Templates",
    "REAL ESTATE SOCIAL MEDIA TEMPLATES",
    "LUXE GIRL VAULT REELS BUNDLE",
    "Funnelcraft",
    "Ai Business Employee (sales Agent Bot)"
];

function createSocialProofPopupHTML() {
    if (document.getElementById('social-proof-pop')) return;
    const pop = document.createElement('div');
    pop.id = 'social-proof-pop';
    pop.className = 'social-proof-container';
    pop.innerHTML = `
        <div class="social-proof-content">
            <p class="buyer-text"><span style="font-size:16px;">🛍️</span> <strong id="buyer-name"></strong> from <span id="buyer-location"></span></p>
            <p class="product-text">just purchased <strong id="bought-product"></strong></p>
            <span class="time-ago" id="buy-time"></span>
        </div>
    `;
    document.body.appendChild(pop);
}

function showSocialProof() {
    const container = document.getElementById('social-proof-pop');
    if (!container) return;

    const randomName = buyerNames[Math.floor(Math.random() * buyerNames.length)];
    const randomLoc = buyerLocations[Math.floor(Math.random() * buyerLocations.length)];
    const randomProd = trendingProducts[Math.floor(Math.random() * trendingProducts.length)];
    const randomTime = Math.floor(Math.random() * 4) + 1;

    document.getElementById('buyer-name').textContent = randomName;
    document.getElementById('buyer-location').textContent = randomLoc;
    document.getElementById('bought-product').textContent = randomProd;
    document.getElementById('buy-time').textContent = `${randomTime} minute${randomTime > 1 ? 's' : ''} ago`;

    container.classList.add('show');
    setTimeout(() => { container.classList.remove('show'); }, 5000);
}

function updateLiveViewers() {
    const viewerElement = document.getElementById('live-viewer-count');
    if (!viewerElement) return;
    let currentViewers = parseInt(viewerElement.textContent) || 47;
    const change = Math.floor(Math.random() * 7) - 3;
    currentViewers += change;
    if (currentViewers < 30) currentViewers = 34;
    if (currentViewers > 85) currentViewers = 78;
    viewerElement.textContent = currentViewers;
}

window.addEventListener('load', () => {
    const track = document.getElementById('marquee-track');
    if (track) {
        const doubleReviews = [...reviews, ...reviews];
        track.innerHTML = doubleReviews.map(rev => `
            <div class="testimonial-card">
                <div>
                    <div class="stars">⭐⭐⭐⭐⭐</div>
                    <p class="review-text">"${rev.text}"</p>
                </div>
                <div class="reviewer-info">
                    <p class="reviewer-name">${rev.name}</p>
                    <p class="reviewer-tag">${rev.tag}</p>
                </div>
            </div>
        `).join('');
    }

    createSocialProofPopupHTML();
    setTimeout(() => {
        showSocialProof();
        setInterval(showSocialProof, 18000);
    }, 4000);

    setInterval(updateLiveViewers, 5000);
});
