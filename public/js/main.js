document.addEventListener('DOMContentLoaded', () => {
    // --- Global Product Data (Simulasi Database) ---
    // This data will be used across all pages for product details and cart operations
    const productsData = {
        "pro2": {
            id: "pro2",
            name: "Invinity Pro",
            price: 149990, // Store price as number for calculations
            formattedPrice: "Rp 149.990",
            description: "Invinity Pro dengan Audio Adaptif, Pembatalan Bising Aktif 2x lebih baik, dan Mode Transparansi yang ditingkatkan. Pengisian MagSafe Case (USB‑C) dengan Speaker dan Loop Tali. Didesain ulang untuk pengalaman suara yang lebih imersif.",
            images: [
                "image/hexa ijo.png",
                "image/hexa pink.png",
                "image/hexa biru.png",
            ],
            thumbnail: "image/hexa item.png", // Main image for cart/display
            options: [, "Sky Blue", "Pink", "Green"]
        },
        "max": {
            id: "max",
            name: "Invinity Max",
            price: 110800,
            formattedPrice: "Rp 110.800",
            description: "Invinity Max menghadirkan pengalaman mendengarkan personal secara menyeluruh. Pembatalan Bising Aktifnya memblokir suara dari luar, sementara Mode Transparansi membiarkan suara masuk. Audio spasial dinamis menghadirkan suara seperti di bioskop. Desain premium dengan bantalan telinga busa memori.",
            images: [
                "image/11.png",
            ],
            thumbnail: "image/11.png",
        },
        "2rd": {
            id: "2rd",
            name: "Invinity Strongest",
            price: 175000,
            formattedPrice: "Rp 175.000",
            description: "Invinity Strongest memiliki Audio Spasial Personalisasi dengan pelacakan kepala dinamis untuk menempatkan suara di sekitar Anda. Tahan air dan keringat, dengan daya tahan baterai hingga 6 jam mendengarkan. Desain berkontur baru untuk kenyamanan sepanjang hari.",
            images: [
                "image/12.png",
                "image/13.png",
            ],
            thumbnail: "image/12.png",
            options: ["Dengan Casger Pengisian MagSafe"]
        },
        "2nd": {
            id: "2nd",
            name: "AirPods (Generasi Ke-2)",
            price: 1999000,
            formattedPrice: "Rp 1.999.000",
            description: "AirPods Generasi ke-2 menghadirkan pengalaman audio nirkabel yang ajaib. Hanya perlu mengeluarkannya, dan siap digunakan dengan semua perangkat Anda. Letakkan di telinga dan AirPods langsung terhubung.",
            images: [
                "images/products/airpods_2.png",
                "images/products/airpods_2_case.png"
            ],
            thumbnail: "image.png",
            options: ["Dengan Casing Pengisian Lightning"]
        },
    };


    // --- Mobile Menu Toggle ---
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mainNav = document.getElementById('mainNav');

    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mobileMenuToggle.querySelector('i').classList.toggle('fa-bars');
            mobileMenuToggle.querySelector('i').classList.toggle('fa-times');
            // Close cart modal if open when opening mobile menu
            if (cartModal.style.display === 'flex') {
                cartModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
            // Close product modal if open
            if (productDetailModal && productDetailModal.style.display === 'flex') {
                productDetailModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    mobileMenuToggle.querySelector('i').classList.remove('fa-times');
                    mobileMenuToggle.querySelector('i').classList.add('fa-bars');
                }
            });
        });
    }

    // --- Active Navigation Link Styling ---
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.main-nav ul li a');

    navLinks.forEach(link => {
        // Simple check: if link's href is found in current path (handles index.html, products.html etc.)
        const linkHref = link.getAttribute('href');
        const fileName = linkHref.substring(linkHref.lastIndexOf('/') + 1);
        if (currentPath.includes(fileName) && fileName !== "") {
            link.classList.add('active');
        } else if (currentPath === '/' || currentPath.endsWith('index.html')) {
            // Special handling for home page
            if (fileName === 'index.html' || fileName === '') {
                link.classList.add('active');
            }
        }
    });

    // --- Dark Mode Toggle ---
    const darkModeToggle = document.getElementById('darkModeToggle');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme) {
        document.body.classList.add(currentTheme);
        if (currentTheme === 'dark-mode') {
            const themeIcon = darkModeToggle.querySelector('i');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    } else {
        document.body.classList.add('dark-mode'); // Default to dark mode
        localStorage.setItem('theme', 'dark-mode');
            const themeIcon = darkModeToggle.querySelector('i');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            document.body.classList.toggle('dark-mode');

            let theme = 'dark-mode';
            if (document.body.classList.contains('light-mode')) {
                theme = 'light-mode';
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            } else {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            }
            localStorage.setItem('theme', theme);
        });
    }

    // --- Testimonial Slider (only on index.html) ---
    const testimonialSlider = document.querySelector('.testimonial-slider');
    const testimonialItems = document.querySelectorAll('.testimonial-item');
    const sliderDotsContainer = document.querySelector('.slider-dots');
    let currentIndex = 0;

    if (testimonialSlider && testimonialItems.length > 0) {
        // Wrap items in a single container for sliding
        const sliderWrapper = document.createElement('div');
        sliderWrapper.style.display = 'flex';
        sliderWrapper.style.transition = 'transform 0.5s ease-in-out';
        testimonialItems.forEach(item => sliderWrapper.appendChild(item));
        testimonialSlider.innerHTML = ''; // Clear existing items
        testimonialSlider.appendChild(sliderWrapper);


        testimonialItems.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (index === 0) dot.classList.add('active');
            dot.dataset.index = index;
            dot.addEventListener('click', () => showSlide(index));
            sliderDotsContainer.appendChild(dot);
        });

        function showSlide(index) {
            currentIndex = index;
            const offset = -currentIndex * 100; // Assuming each item takes 100% width
            sliderWrapper.style.transform = `translateX(${offset}%)`;

            document.querySelectorAll('.dot').forEach((dot, idx) => {
                dot.classList.toggle('active', idx === currentIndex);
            });
        }

        setInterval(() => {
            currentIndex = (currentIndex + 1) % testimonialItems.length;
            showSlide(currentIndex);
        }, 5000); // Change slide every 5 seconds
    }

    // --- Product Detail Modal (Lightbox) ---
    const productDetailModal = document.getElementById('productDetailModal');
    const closeProductModalButton = productDetailModal ? productDetailModal.querySelector('.close-button') : null;
    const modalMainImage = document.getElementById('modalMainImage');
    const modalThumbnails = document.getElementById('modalThumbnails');
    const modalProductName = document.getElementById('modalProductName');
    const modalProductPrice = document.getElementById('modalProductPrice');
    const modalProductDescription = document.getElementById('modalProductDescription');
    const modalModelOptions = document.getElementById('modalModelOptions');
    const addToCartButton = productDetailModal ? productDetailModal.querySelector('.primary-btn') : null; // "Beli Sekarang" button in modal

    // Function to get product data from either static data or API data
    function getProductData(productId) {
        // First check static productsData
        if (productsData[productId]) {
            return productsData[productId];
        }
        // Then check dynamic API products
        if (window.apiProducts && window.apiProducts.length > 0) {
            return window.apiProducts.find(p => p.id === productId);
        }
        return null;
    }

    // Function to open product detail modal
    function openProductDetail(productId) {
        const product = getProductData(productId);

        if (product) {
            modalProductName.textContent = product.name;
            modalProductPrice.textContent = product.formattedPrice || `Rp ${product.price ? Number(product.price).toLocaleString('id-ID') : '-'}`;
            modalProductDescription.textContent = product.description;

            // Handle images - for API products, use single image or thumbnail
            const images = product.images || [product.image || product.thumbnail || 'image/default.png'];
            modalMainImage.src = images[0];
            modalMainImage.alt = product.name;

            // Clear and populate thumbnails
            modalThumbnails.innerHTML = '';
            images.forEach((imgSrc, index) => {
                const thumbImg = document.createElement('img');
                thumbImg.src = imgSrc;
                thumbImg.alt = `Thumbnail ${index + 1}`;
                thumbImg.classList.add('product-thumbnail');
                if (index === 0) thumbImg.classList.add('active');
                thumbImg.addEventListener('click', () => {
                    modalMainImage.src = imgSrc;
                    modalThumbnails.querySelectorAll('.product-thumbnail').forEach(t => t.classList.remove('active'));
                    thumbImg.classList.add('active');
                });
                modalThumbnails.appendChild(thumbImg);
            });

            // Clear and populate options
            modalModelOptions.innerHTML = '';
            if (product.options && product.options.length > 0) {
                modalModelOptions.style.display = 'block';
                product.options.forEach((option, index) => {
                    const optionBtn = document.createElement('button');
                    optionBtn.classList.add('model-option-btn');
                    optionBtn.textContent = option;
                    if (index === 0) optionBtn.classList.add('active');
                    optionBtn.addEventListener('click', () => {
                        modalModelOptions.querySelectorAll('.model-option-btn').forEach(btn => btn.classList.remove('active'));
                        optionBtn.classList.add('active');
                        // You could potentially update the displayed product name/price based on option here
                    });
                    modalModelOptions.appendChild(optionBtn);
                });
            } else {
                modalModelOptions.style.display = 'none';
            }

            // Set up Add to Cart button for this product
            if (addToCartButton) {
                addToCartButton.textContent = "Tambahkan ke Keranjang"; // Change text from "Beli Sekarang"
                addToCartButton.onclick = () => {
                    addToCart(product.id, 1); // Add 1 quantity of this product
                    productDetailModal.style.display = 'none'; // Close modal after adding
                    document.body.style.overflow = 'auto';
                };
            }

            productDetailModal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent body scroll
        }
    }

    if (productDetailModal) { // Only set up if modal exists on the page
        // Use event delegation for "Lihat Detail" buttons (works for dynamically loaded content)
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('product-btn')) {
                const productId = e.target.dataset.productId;
                if (productId) {
                    openProductDetail(productId);
                }
            }
        });

        if (closeProductModalButton) {
            closeProductModalButton.addEventListener('click', () => {
                productDetailModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target === productDetailModal) {
                productDetailModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }


    // --- Shopping Cart Functionality ---
    const cartToggle = document.getElementById('cartToggle');
    const cartModal = document.getElementById('cartModal');
    const closeCartModal = document.getElementById('closeCartModal');
    const cartCount = document.getElementById('cartCount');
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartTotalElement = document.getElementById('cartTotal');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const checkoutButton = document.getElementById('checkoutButton');

    let cart = JSON.parse(localStorage.getItem('airpodsCart')) || [];

    function saveCart() {
        localStorage.setItem('airpodsCart', JSON.stringify(cart));
        updateCartDisplay();
    }

    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        if (totalItems > 0) {
            cartCount.style.display = 'flex'; // Show count bubble
        } else {
            cartCount.style.display = 'none'; // Hide if empty
        }
    }

    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    // === updateCartDisplay MULAI ===
    function updateCartDisplay() {
        cartItemsContainer.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            emptyCartMessage.style.display = 'block';
            checkoutButton.disabled = true;
            checkoutButton.classList.remove('primary-btn');
            checkoutButton.style.backgroundColor = 'gray';
            checkoutButton.style.cursor = 'not-allowed';

        } else {
            emptyCartMessage.style.display = 'none';
            checkoutButton.disabled = false;
            checkoutButton.classList.add('primary-btn');
            checkoutButton.style.backgroundColor = '';
            checkoutButton.style.cursor = 'pointer';

            cart.forEach(item => {
                const product = getProductData(item.productId);
                if (product) {
                    const cartItemDiv = document.createElement('div');
                    cartItemDiv.classList.add('cart-item');
                    cartItemDiv.dataset.productId = item.productId;

                    cartItemDiv.innerHTML = `
                        <img src="${product.thumbnail || product.image || 'image/default.png'}" alt="${product.name}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;"> <!-- GANTI GAMBAR DI SINI -->
                        <div class="cart-item-details">
                            <h4>${product.name}</h4>
                            <p class="price">${product.formattedPrice || `Rp ${product.price ? Number(product.price).toLocaleString('id-ID') : '-'}`}</p>
                        </div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn decrease-qty" data-id="${item.productId}">-</button>
                            <input type="number" value="${item.quantity}" min="1" readonly>
                            <button class="quantity-btn increase-qty" data-id="${item.productId}">+</button>
                        </div>
                        <button class="remove-item-btn" data-id="${item.productId}"><i class="fas fa-trash-alt"></i></button>
                    `;
                    cartItemsContainer.appendChild(cartItemDiv);
                    total += product.price * item.quantity;
                }
            });
        }

        cartTotalElement.textContent = formatRupiah(total);
        updateCartCount();
    }
    // === updateCartDisplay SELESAI ===


document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const productId = e.target.dataset.productId;
        if (productId && productsData[productId]) {
            addToCart(productId, 1);
        }
    }
});

    function addToCart(productId, quantity = 1) {
        const existingItemIndex = cart.findIndex(item => item.productId === productId);
        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += quantity;
        } else {
            cart.push({ productId, quantity });
        }
        saveCart();
        alert(`"${productsData[productId].name}" ditambahkan ke keranjang!`);
    }

    function updateQuantity(productId, change) {
        const itemIndex = cart.findIndex(item => item.productId === productId);
        if (itemIndex > -1) {
            cart[itemIndex].quantity += change;
            if (cart[itemIndex].quantity <= 0) {
                cart.splice(itemIndex, 1); // Remove if quantity is 0 or less
            }
            saveCart();
        }
    }

    function removeItem(productId) {
        cart = cart.filter(item => item.productId !== productId);
        saveCart();
    }

    // Event Listeners for Cart Modal
    if (cartToggle && cartModal && closeCartModal) {
        cartToggle.addEventListener('click', () => {
            updateCartDisplay(); // Refresh display every time it's opened
            cartModal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent body scroll
            // Close other modals if open
            if (productDetailModal && productDetailModal.style.display === 'flex') {
                productDetailModal.style.display = 'none';
            }
            if (mainNav.classList.contains('active')) { // Close mobile menu if open
                mainNav.classList.remove('active');
                mobileMenuToggle.querySelector('i').classList.remove('fa-times');
                mobileMenuToggle.querySelector('i').classList.add('fa-bars');
            }
        });

        closeCartModal.addEventListener('click', () => {
            cartModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        window.addEventListener('click', (event) => {
            if (event.target === cartModal) {
                cartModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        // Event delegation for quantity and remove buttons inside cart
        cartItemsContainer.addEventListener('click', (event) => {
            const target = event.target;
            const productId = target.dataset.id || target.closest('button')?.dataset.id;

            if (productId) {
                if (target.classList.contains('increase-qty')) {
                    updateQuantity(productId, 1);
                } else if (target.classList.contains('decrease-qty')) {
                    updateQuantity(productId, -1);
                } else if (target.classList.contains('remove-item-btn') || target.closest('.remove-item-btn')) {
                    removeItem(productId);
                }
            }
        });

        // Checkout Button Logic
        if (checkoutButton) {
            checkoutButton.addEventListener('click', () => {
                if (cart.length > 0) {
                    // alert(' Pesanan Anda telah diterima!\nTotal: ' + cartTotalElement.textContent);
                    cart = []; // Clear cart after checkout
                    saveCart(); // Update localStorage and display
                    cartModal.style.display = 'none'; // Close cart modal
                    document.body.style.overflow = 'auto';
                } else {
                    alert('Keranjang Anda kosong. Tambahkan produk sebelum checkout.');
                }
            });
        }
    }


    // Initial cart display on page load
    updateCartDisplay();


    // --- Form Validation (Contact Form - only on contact.html) ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            let isValid = true;

            if (name === '') {
                alert('Nama tidak boleh kosong.');
                isValid = false;
            }
            if (email === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Masukkan alamat email yang valid.');
                isValid = false;
            }
            if (message === '') {
                alert('Pesan tidak boleh kosong.');
                isValid = false;
            }

            if (isValid) {
                alert('Pesan Anda telah terkirim! Terima kasih.');
                contactForm.reset();
                console.log({ name, email, message }); // Log data for simulation
            }
        });
    }

    // --- Product Filtering (only on products.html) ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productGrid = document.getElementById('productGrid');

    if (filterButtons.length > 0 && productGrid) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.dataset.filter;

                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                document.querySelectorAll('.product-card').forEach(card => {
                    const category = card.dataset.category;
                    if (filter === 'all' || category === filter) {
                        card.style.display = 'flex'; // Show
                    } else {
                        card.style.display = 'none'; // Hide
                    }
                });
            });
        });
    }


    // --- Social Share Buttons ---
    window.sharePage = (platform) => {
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(document.title);
        let shareUrl = '';

        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${title}%20${url}`;
                break;
            default:
                console.warn('Platform not supported for sharing.');
                return;
        }
        window.open(shareUrl, '_blank', 'width=600,height=400');
    };
});