// Variable global para almacenar el carrito
let cart = [];

// Elementos del DOM
const cartIcon = document.getElementById('cart-icon');
const cartCount = document.getElementById('cart-count');
const modal = document.getElementById('cart-modal');
const closeButton = document.querySelector('.close-button');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const checkoutButton = document.getElementById('checkout-button');

// Cargar carrito desde localStorage al inicio
function loadCartFromLocalStorage() {
    const storedCart = localStorage.getItem('shoppingCart');
    if (storedCart) {
        try {
            const parsedCart = JSON.parse(storedCart);

            // Validar si hay items con IDs antiguos (que no empiezan con "IT")
            // Los IDs nuevos son del tipo "IT01", "IT02"...
            const hasInvalidItems = parsedCart.some(item => !item.id || !item.id.toString().startsWith('IT'));

            if (hasInvalidItems) {
                console.warn('Detectados items con formato antiguo. Reiniciando carrito.');
                alert('Hemos actualizado nuestro inventario. Por favor, vuelve a agregar tus productos al carrito.');
                cart = [];
                localStorage.removeItem('shoppingCart');
                updateCartCount();
                renderCart(); // Asegurar que se limpie la vista
            } else {
                cart = parsedCart;
                updateCartCount();
                renderCart();
            }
        } catch (e) {
            console.error('Error al cargar el carrito:', e);
            cart = [];
            localStorage.removeItem('shoppingCart');
        }
    }
}

// Guardar carrito en localStorage
function saveCartToLocalStorage() {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
}

// Evento para abrir la modal
cartIcon.addEventListener('click', () => {
    renderCart();
    modal.style.display = 'flex'; // Cambiado a flex para centrar
});

// Evento para cerrar la modal
closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Cerrar la modal haciendo click fuera de ella
window.addEventListener('click', (event) => {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
});

/**
 * Agrega un producto al carrito o incrementa su cantidad si ya existe.
 */
function addItemToCart(id, name, price, currentStock) {
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        if (existingItem.quantity < currentStock) {
            existingItem.quantity++;
            existingItem.maxStock = currentStock; // Actualizamos o guardamos stock máximo conocido
            saveCartToLocalStorage(); // Guardar cambios
            updateCartCount();
            alert(`"${name}" agregado al carrito. Cantidad actual: ${existingItem.quantity}`);
        } else {
            alert(`No hay suficiente stock para "${name}". Stock disponible: ${currentStock}.`);
        }
    } else {
        if (currentStock > 0) {
            cart.push({ id, name, price, quantity: 1, maxStock: currentStock });
            saveCartToLocalStorage(); // Guardar cambios
            updateCartCount();
            alert(`"${name}" agregado al carrito.`);
        } else {
            alert(`"${name}" está agotado y no se puede agregar al carrito.`);
        }
    }
}

/**
 * Renderiza la lista de productos dentro de la modal del carrito.
 */
function renderCart() {
    cartItemsContainer.innerHTML = ''; // Limpia la lista
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<li>El carrito está vacío.</li>';
    } else {
        cart.forEach(item => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.marginBottom = '10px';
            li.style.borderBottom = '1px solid #eee';
            li.style.paddingBottom = '10px';

            const subtotal = item.price * item.quantity;
            total += subtotal;

            li.innerHTML = `
                <div style="flex: 2; text-align: left; padding-right: 10px;">
                    <span style="font-weight: 500;">${item.name}</span>
                </div>
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <button onclick="decreaseCartQuantity('${item.id}')" style="padding: 2px 8px; border-radius: 4px; border: 1px solid #ccc; background: #f9f9f9; cursor: pointer;">-</button>
                    <span style="min-width: 20px; text-align: center;">${item.quantity}</span>
                    <button onclick="increaseCartQuantity('${item.id}')" style="padding: 2px 8px; border-radius: 4px; border: 1px solid #ccc; background: #f9f9f9; cursor: pointer;">+</button>
                </div>
                <div style="flex: 1; text-align: right; font-weight: bold;">
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
            `;
            cartItemsContainer.appendChild(li);
        });
    }

    cartTotalElement.textContent = total.toFixed(2);
}

// Funciones globales expuestas para los botones +/-
window.increaseCartQuantity = function (id) {
    const item = cart.find(i => i.id === id);
    if (item) {
        if (item.maxStock && item.quantity >= item.maxStock) {
            alert(`No hay más stock disponible para "${item.name}".`);
            return;
        }
        item.quantity++;
        saveCartToLocalStorage();
        updateCartCount();
        renderCart();
    }
};

window.decreaseCartQuantity = function (id) {
    const index = cart.findIndex(i => i.id === id);
    if (index > -1) {
        cart[index].quantity--;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCartToLocalStorage();
        updateCartCount();
        renderCart();
    }
};

/**
 * Actualiza el número de productos en el ícono del carrito.
 */
function updateCartCount() {
    const totalCount = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = totalCount;
}

/**
 * Finaliza la compra enviando el pedido por WhatsApp.
 */
/**
 * Finaliza la compra enviando el pedido por WhatsApp y registrándolo en la BD.
 */
// Elementos del Modal de Pago
const paymentModal = document.getElementById('payment-modal');
const closePaymentButton = document.querySelector('.close-button-payment');
const paymentTotalElement = document.getElementById('payment-total');

// Abrir modal de pago al hacer click en "Proceder al Pago"
checkoutButton.addEventListener('click', () => {
    if (cart.length === 0) {
        alert('El carrito está vacío. Agrega productos para finalizar la compra.');
        return;
    }

    // Calcular total
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    paymentTotalElement.textContent = total.toFixed(2);

    // Cerrar modal del carrito y abrir modal de pago
    modal.style.display = 'none';
    paymentModal.style.display = 'block';

    const container = document.getElementById('paypal-button-container');
    container.innerHTML = '';

    paypal.Buttons({
        createOrder: function (data, actions) {
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: total.toFixed(2)
                    }
                }]
            });
        },
        onApprove: function (data, actions) {
            return actions.order.capture().then(async function (details) {
                // Preparar items para la API
                const apiItems = cart.map(item => ({
                    idItemInventario: item.id,
                    cantidad: item.quantity
                }));

                try {
                    const baseUrl = typeof API_URL !== 'undefined' ? API_URL : '';
                    const response = await fetch(`${baseUrl}/api/pedidos`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            items: apiItems,
                            metodoPago: 'PayPal',
                            detallesPago: {
                                titular: details.payer.name.given_name,
                                ultimosDigitos: data.orderID
                            }
                        })
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.mensaje || 'Error al procesar el pedido.');
                    }

                    // Limpiar carrito
                    cart = [];
                    saveCartToLocalStorage();
                    updateCartCount();
                    renderCart();

                    paymentModal.style.display = 'none';

                    // Redirigir a ticket de confirmación
                    const urlParamsCart = new URLSearchParams(window.location.search);
                    const idTallerCart = urlParamsCart.get('idTaller');
                    let redirectUrl = `../ticket_confirmacion.html?idTicket=${result.idTicket}`;
                    if (idTallerCart) redirectUrl += `&idTaller=${idTallerCart}`;

                    if (result.idTicket) {
                        window.location.href = redirectUrl;
                    } else {
                        window.open(`${baseUrl}/api/pedidos/${result.idPedido}/ticket`, '_blank');
                        location.reload();
                    }

                } catch (error) {
                    console.error('Error:', error);
                    // Provide a non-blocking error display inside the modal instead of alert
                    paymentTotalElement.innerHTML = `<span style="color:red; font-size:14px;">Error al procesar: ${error.message}</span>`;
                }
            });
        }
    }).render('#paypal-button-container');
});

// Cerrar modal de pago
closePaymentButton.addEventListener('click', () => {
    paymentModal.style.display = 'none';
});

// Cerrar modal al hacer click fuera
window.addEventListener('click', (event) => {
    if (event.target == paymentModal) {
        paymentModal.style.display = 'none';
    }
    if (event.target == modal) {
        modal.style.display = 'none';
    }
});


// Inicializa el contador del carrito y carga desde localStorage
loadCartFromLocalStorage();