const API_URL = 'http://localhost:5000/api';
let cart = [];
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let isSignUpMode = false;

window.onload = () => {
  renderUserInfo();
  loadProducts();
};

function renderUserInfo() {
  const authBtn = document.getElementById('authBtn');
  const greeting = document.getElementById('userGreeting');
  const adminBtn = document.getElementById('adminBtn');

  if (currentUser) {
    greeting.innerText = `Hi, ${currentUser.user_metadata?.full_name || currentUser.email}`;
    authBtn.innerText = 'Logout';
    authBtn.onclick = logout;
    if (currentUser.role === 'admin') adminBtn.style.display = 'inline-block';
  } else {
    greeting.innerText = '';
    authBtn.innerText = 'Login';
    authBtn.onclick = openAuthModal;
    adminBtn.style.display = 'none';
  }
}

async function loadProducts() {
  try {
    const res = await fetch(`${API_URL}/products`);
    const products = await res.json();
    const list = document.getElementById('productsList');
    list.innerHTML = products.map(p => `
      <div class="product-card">
        <img src="${p.image_url || 'https://via.placeholder.com/150'}" alt="${p.title}">
        <div>
          <h3>${p.title}</h3>
          <p>${p.unit || ''}</p>
          <div class="price">₹${p.price}</div>
        </div>
        <button class="btn-primary" onclick="addToCart('${p.id}', '${p.title}', ${p.price})">Add to Cart</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Server connect nahi ho raha:', err);
  }
}

function addToCart(id, title, price) {
  const existing = cart.find(i => i.id === id);
  if (existing) existing.quantity++;
  else cart.push({ id, title, price, quantity: 1 });
  updateCartUI();
}

function updateCartUI() {
  document.getElementById('cartCount').innerText = cart.reduce((s, i) => s + i.quantity, 0);
  const cartItemsDiv = document.getElementById('cartItems');
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  cartItemsDiv.innerHTML = cart.map(i => `
    <div class="cart-item">
      <div>
        <strong>${i.title}</strong><br>
        <small>₹${i.price} x ${i.quantity}</small>
      </div>
      <div>
        <span style="font-weight:600; margin-right:8px;">₹${i.price * i.quantity}</span>
        <button onclick="removeFromCart('${i.id}')" style="color:red; background:none; padding:2px;">✕</button>
      </div>
    </div>
  `).join('');

  document.getElementById('cartTotal').innerText = total;
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  updateCartUI();
}

document.getElementById('cartBtn').onclick = () => document.getElementById('cartDrawer').style.display = 'flex';
function closeCart() { document.getElementById('cartDrawer').style.display = 'none'; }

async function checkout() {
  if (!currentUser) {
    alert('Order place karne ke liye pehle Login karo.');
    openAuthModal();
    return;
  }
  const address = document.getElementById('deliveryAddress').value;
  const phone = document.getElementById('deliveryPhone').value;
  if (!address || !phone) return alert('Address aur Phone number bharna zaroori hai.');
  if (cart.length === 0) return alert('Cart khali hai.');

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, total, address, phone, items: cart })
  });

  const data = await res.json();
  if (res.ok) {
    alert('Order Placed Successfully!');
    cart = [];
    updateCartUI();
    closeCart();
  } else {
    alert(data.error);
  }
}

function openAuthModal() { document.getElementById('authModal').style.display = 'flex'; }
function closeAuthModal() { document.getElementById('authModal').style.display = 'none'; }

function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  document.getElementById('modalTitle').innerText = isSignUpMode ? 'Sign Up' : 'Login';
  document.getElementById('authName').style.display = isSignUpMode ? 'block' : 'none';
  document.getElementById('toggleText').innerText = isSignUpMode ? 'Already have an account?' : "Don't have an account?";
}

async function handleAuthSubmit() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const full_name = document.getElementById('authName').value;

  const endpoint = isSignUpMode ? '/auth/signup' : '/auth/login';
  const payload = isSignUpMode ? { email, password, full_name } : { email, password };

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (res.ok) {
    if (isSignUpMode) {
      alert('Signup successful! Ab Login karo.');
      toggleAuthMode();
    } else {
      currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      closeAuthModal();
      renderUserInfo();
    }
  } else {
    alert(data.error);
  }
}

function logout() {
  localStorage.clear();
  currentUser = null;
  renderUserInfo();
}