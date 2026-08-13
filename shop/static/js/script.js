// ============================================
// MY SHOP - CART SYSTEM
// ============================================

// Product data will be fetched from the database
let products = [];

// ============================================
// CART
// ============================================

let cart = [];

// ============================================
// LOAD CART FROM LOCAL STORAGE
// ============================================

function loadCart() {
    try {
        const savedCart = localStorage.getItem("shopCart");

        if (savedCart) {
            const parsedCart = JSON.parse(savedCart);

            if (Array.isArray(parsedCart)) {
                cart = parsedCart;
            }
        }
    } catch (error) {
        console.error("Could not load cart:", error);
        cart = [];
    }
}

// ============================================
// SAVE CART
// ============================================

function saveCart() {
    try {
        localStorage.setItem("shopCart", JSON.stringify(cart));
    } catch (error) {
        console.error("Could not save cart:", error);
    }
}

// ============================================
// FETCH PRODUCTS FROM DATABASE
// ============================================

async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            products = data.products;
            console.log(`Loaded ${products.length} products from database`);
            return true;
        } else {
            throw new Error('Failed to load products');
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        return false;
    }
}

// ============================================
// RENDER PRODUCTS
// ============================================

function renderProducts() {
    const container = document.getElementById("products-container");
    const countDisplay = document.getElementById("product-count");

    if (!container) return;

    if (countDisplay) {
        countDisplay.textContent = products.length;
    }

    if (products.length === 0) {
        container.innerHTML = `
            <div class="no-products-container">
                <p class="no-products">📦 No products available yet.</p>
                <p class="no-products-sub">Please check back later!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    products.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";

        card.innerHTML = `
            <div class="product-image-wrapper">
                <img 
                    src="${product.image}" 
                    alt="${product.name}"
                    loading="lazy"
                    onerror="this.src='https://via.placeholder.com/300x200/cccccc/ffffff?text=No+Image'"
                >
            </div>

            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                
                ${product.description ? `<p class="product-description">${product.description.substring(0, 100)}${product.description.length > 100 ? '...' : ''}</p>` : ''}

                <div class="price">
                    KSh ${Number(product.price).toLocaleString()}
                </div>

                <button
                    type="button"
                    class="add-to-cart-btn"
                    data-id="${product.id}"
                    data-name="${product.name}"
                    data-price="${product.price}"
                >
                    🛒 Add to Cart
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    // Add click events
    const buttons = container.querySelectorAll(".add-to-cart-btn");

    buttons.forEach(button => {
        button.addEventListener("click", function () {
            const id = Number(this.dataset.id);
            const name = this.dataset.name;
            const price = Number(this.dataset.price);

            addToCart(id, name, price);
            
            // Add a quick animation
            this.textContent = "✅ Added!";
            this.classList.add("added");
            
            setTimeout(() => {
                this.textContent = "🛒 Add to Cart";
                this.classList.remove("added");
            }, 1000);
        });
    });
}

// ============================================
// ADD TO CART
// ============================================

function addToCart(id, name, price) {
    const existingProduct = cart.find(item => item.id === id);

    if (existingProduct) {
        existingProduct.quantity += 1;
    } else {
        cart.push({
            id: id,
            name: name,
            price: Number(price),
            quantity: 1
        });
    }

    saveCart();
    updateCart();
    
    // Show toast notification
    showToast(`${name} added to cart!`);
}

// ============================================
// REMOVE FROM CART
// ============================================

function removeFromCart(id) {
    const item = cart.find(item => item.id === id);
    
    cart = cart.filter(item => item.id !== id);

    saveCart();
    updateCart();
    
    if (item) {
        showToast(`${item.name} removed from cart`);
    }
}

// ============================================
// UPDATE QUANTITY
// ============================================

function updateQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            saveCart();
            updateCart();
        }
    }
}

// ============================================
// UPDATE CART DISPLAY
// ============================================

function updateCart() {
    const cartItems = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const cartTotal = document.getElementById("cart-total");

    if (!cartItems || !cartCount || !cartTotal) {
        return;
    }

    // Total quantity
    const totalItems = cart.reduce(
        (total, item) => total + Number(item.quantity),
        0
    );

    cartCount.textContent = totalItems;

    // Empty cart
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <p class="empty-msg">🛒 Your cart is empty</p>
                <p class="empty-sub">Add some products to get started!</p>
            </div>
        `;

        cartTotal.textContent = "0.00";
        return;
    }

    cartItems.innerHTML = "";

    let total = 0;

    cart.forEach(item => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        total += itemTotal;

        const cartItem = document.createElement("div");
        cartItem.className = "cart-item";

        cartItem.innerHTML = `
            <div class="cart-item-info">
                <strong class="cart-item-name">${item.name}</strong>
                <p class="cart-item-price">
                    KSh ${Number(item.price).toLocaleString()} each
                </p>
                <div class="quantity-controls">
                    <button class="qty-btn minus" data-id="${item.id}">−</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn plus" data-id="${item.id}">+</button>
                </div>
            </div>
            <div class="cart-item-actions">
                <p class="cart-item-total">
                    KSh ${itemTotal.toLocaleString()}
                </p>
                <button class="remove-btn" data-id="${item.id}">
                    🗑️ Remove
                </button>
            </div>
        `;

        cartItems.appendChild(cartItem);
    });

    cartTotal.textContent = total.toLocaleString();

    // Add event listeners
    const removeButtons = cartItems.querySelectorAll(".remove-btn");
    removeButtons.forEach(button => {
        button.addEventListener("click", function () {
            const id = Number(this.dataset.id);
            removeFromCart(id);
        });
    });

    const plusButtons = cartItems.querySelectorAll(".qty-btn.plus");
    plusButtons.forEach(button => {
        button.addEventListener("click", function () {
            const id = Number(this.dataset.id);
            updateQuantity(id, 1);
        });
    });

    const minusButtons = cartItems.querySelectorAll(".qty-btn.minus");
    minusButtons.forEach(button => {
        button.addEventListener("click", function () {
            const id = Number(this.dataset.id);
            updateQuantity(id, -1);
        });
    });
}

// ============================================
// TOAST NOTIFICATION
// ============================================

function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ============================================
// OPEN CART
// ============================================

function openCart() {
    const cartSidebar = document.getElementById("cart-sidebar");
    const overlay = document.getElementById("overlay");

    if (cartSidebar) {
        cartSidebar.classList.add("active");
    }

    if (overlay) {
        overlay.classList.add("active");
    }

    document.body.style.overflow = "hidden";
}

// ============================================
// CLOSE CART
// ============================================

function closeCart() {
    const cartSidebar = document.getElementById("cart-sidebar");
    const overlay = document.getElementById("overlay");

    if (cartSidebar) {
        cartSidebar.classList.remove("active");
    }

    if (overlay) {
        overlay.classList.remove("active");
    }

    document.body.style.overflow = "";
}

// ============================================
// WHATSAPP CHECKOUT
// ============================================

function checkout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    let message = "Hello, I would like to order:%0A%0A";

    let total = 0;

    cart.forEach(item => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        total += itemTotal;

        message += `• ${item.name}%0A`;
        message += `  KSh ${Number(item.price).toLocaleString()} × ${item.quantity} = KSh ${itemTotal.toLocaleString()}%0A%0A`;
    });

    message += `%0A*Total: KSh ${total.toLocaleString()}*`;

    // YOUR WHATSAPP NUMBER
    const phoneNumber = "254111606683";

    const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`;

    window.open(whatsappURL, "_blank", "noopener,noreferrer");
}

// ============================================
// SETUP EVENTS
// ============================================

function setupEvents() {
    const cartBtn = document.getElementById("cart-btn");
    const closeCartBtn = document.getElementById("close-cart");
    const overlay = document.getElementById("overlay");
    const checkoutBtn = document.getElementById("checkout-btn");

    // Open cart
    if (cartBtn) {
        cartBtn.addEventListener("click", function () {
            openCart();
        });
    }

    // Close cart
    if (closeCartBtn) {
        closeCartBtn.addEventListener("click", function () {
            closeCart();
        });
    }

    // Close by clicking overlay
    if (overlay) {
        overlay.addEventListener("click", function () {
            closeCart();
        });
    }

    // Checkout
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", function () {
            checkout();
        });
    }

    // Close cart with Escape key
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeCart();
        }
    });
}

// ============================================
// START SHOP
// ============================================

async function initShop() {
    console.log("Initializing shop...");
    
    // Load cart from local storage
    loadCart();
    
    // Show loading state
    const container = document.getElementById("products-container");
    if (container) {
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading products...</p>
            </div>
        `;
    }
    
    // Fetch products from database
    const success = await fetchProducts();
    
    if (success) {
        // Render products
        renderProducts();
    } else {
        // Show error message
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <p class="error-message">❌ Failed to load products</p>
                    <button onclick="retryLoad()" class="retry-btn">Retry</button>
                </div>
            `;
        }
    }
    
    // Update cart display
    updateCart();
    
    // Setup event listeners
    setupEvents();
    
    console.log("Shop initialization complete!");
}

// ============================================
// RETRY LOADING PRODUCTS
// ============================================

async function retryLoad() {
    const container = document.getElementById("products-container");
    
    if (container) {
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading products...</p>
            </div>
        `;
    }
    
    const success = await fetchProducts();
    
    if (success) {
        renderProducts();
    } else {
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <p class="error-message">❌ Failed to load products</p>
                    <button onclick="retryLoad()" class="retry-btn">Retry</button>
                </div>
            `;
        }
    }
}

// ============================================
// START AFTER PAGE LOAD
// ============================================

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initShop);
} else {
    initShop();
}