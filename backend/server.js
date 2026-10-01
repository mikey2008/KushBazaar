const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, full_name } = req.body;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, role: 'customer' } }
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Signup successful', user: data.user });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: error.message });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', data.user.id)
    .single();

  res.json({
    token: data.session.access_token,
    user: { ...data.user, role: profile ? profile.role : 'customer' }
  });
});

// Get Products
app.get('/api/products', async (req, res) => {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Admin Add Product
app.post('/api/admin/products', async (req, res) => {
  const { title, price, unit, image_url } = req.body;
  const { data, error } = await supabase.from('products').insert([{ title, price, unit, image_url }]).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// Place Order
app.post('/api/orders', async (req, res) => {
  const { userId, total, address, phone, items } = req.body;

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert([{
      user_id: userId || null,
      total_amount: total,
      delivery_address: address,
      phone: phone,
      status: 'pending'
    }])
    .select()
    .single();

  if (orderErr) return res.status(400).json({ error: orderErr.message });

  const orderItems = items.map(item => ({
    order_id: order.id,
    product_id: item.id,
    quantity: item.quantity,
    price_per_item: item.price
  }));

  const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
  if (itemsErr) return res.status(400).json({ error: itemsErr.message });

  res.json({ message: 'Order placed successfully!', orderId: order.id });
});

// Admin Get Orders
app.get('/api/admin/orders', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*))')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Admin Update Order Status
app.patch('/api/admin/orders/:id', async (req, res) => {
  const { status } = req.body;
  const { error } = await supabase.from('orders').update({ status }).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Status updated' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));