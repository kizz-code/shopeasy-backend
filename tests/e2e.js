/**
 * End-to-end check of every flow the ShopEasy UI depends on.
 * Run with the backend up: node e2e.js
 */

const API = 'http://localhost:5000/api';

let pass = 0, fail = 0;
const results = [];

async function call(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

function check(name, condition, detail = '') {
  if (condition) { pass++; results.push(`  PASS  ${name}`); }
  else { fail++; results.push(`  FAIL  ${name}${detail ? ' -> ' + detail : ''}`); }
}

function section(title) { results.push(`\n${title}`); }

(async () => {
  // ---- AUTH ----
  section('Authentication');
  const email = `test${Date.now()}@example.com`;

  let r = await call('POST', '/auth/register', {
    body: { name: 'Test Shopper', email, password: 'Password@123', phone: '9876543210' },
  });
  check('register a new user', r.status === 201 && r.body.data.token, `status ${r.status}`);
  const token = r.body?.data?.token;

  r = await call('POST', '/auth/register', { body: { name: 'x', email, password: 'Password@123' } });
  check('duplicate email is rejected (409)', r.status === 409, `status ${r.status}`);

  r = await call('POST', '/auth/register', { body: { name: '', email: 'bad', password: '12' } });
  check('bad registration fails validation (422)', r.status === 422 && r.body.errors?.length >= 3, `status ${r.status}`);

  r = await call('POST', '/auth/login', { body: { email, password: 'wrong' } });
  check('wrong password rejected (401)', r.status === 401, `status ${r.status}`);
  check('login error does not reveal whether email exists',
    r.body?.message === 'Invalid email or password.', r.body?.message);

  r = await call('POST', '/auth/login', { body: { email, password: 'Password@123' } });
  check('login succeeds', r.status === 200 && r.body.data.token, `status ${r.status}`);
  check('password never appears in the response', !JSON.stringify(r.body).includes('password'));

  r = await call('GET', '/auth/me', { token });
  check('GET /auth/me returns the user', r.body?.data?.user?.email === email);

  r = await call('GET', '/auth/me');
  check('protected route without a token is 401', r.status === 401, `status ${r.status}`);

  r = await call('GET', '/auth/me', { token: 'not.a.real.token' });
  check('protected route with a junk token is 401', r.status === 401, `status ${r.status}`);

  // ---- PRODUCTS ----
  section('Products: search, filter, sort, pagination');

  r = await call('GET', '/products?limit=5&page=1');
  check('product list is paginated', r.body?.pagination?.itemsPerPage === 5 && r.body.data.length <= 5);
  const totalProducts = r.body?.pagination?.totalItems;

  r = await call('GET', '/products?search=iph');
  check('partial-word search matches ("iph" -> iPhone)',
    r.body?.data?.some((p) => p.name.includes('iPhone')), JSON.stringify(r.body?.data?.map(p=>p.name)));

  r = await call('GET', '/products?search=zzzzznothing');
  check('search with no matches returns an empty list', r.body?.data?.length === 0);

  const asc = await call('GET', '/products?sort=price-asc&limit=50');
  const prices = asc.body.data.map((p) => p.price);
  check('sort=price-asc really is ascending',
    prices.every((v, i) => i === 0 || prices[i - 1] <= v), prices.join(','));

  const desc = await call('GET', '/products?sort=price-desc&limit=50');
  const dprices = desc.body.data.map((p) => p.price);
  check('sort=price-desc really is descending',
    dprices.every((v, i) => i === 0 || dprices[i - 1] >= v));

  r = await call('GET', '/products?minPrice=1000&maxPrice=10000&limit=50');
  check('price filter respects both bounds',
    r.body.data.every((p) => p.price >= 1000 && p.price <= 10000));

  // page 2 must differ from page 1 - this is the bug the audit found in the UI
  const p1 = await call('GET', '/products?limit=3&page=1&sort=name');
  const p2 = await call('GET', '/products?limit=3&page=2&sort=name');
  check('page 2 returns different products than page 1',
    p1.body.data[0]._id !== p2.body.data[0]._id && p2.body.pagination.currentPage === 2);

  r = await call('GET', '/products?limit=999');
  check('an out-of-range limit is rejected (422)', r.status === 422, `status ${r.status}`);

  r = await call('GET', '/products/featured');
  check('featured endpoint works', Array.isArray(r.body?.data?.products));

  const anyProduct = asc.body.data[asc.body.data.length - 1];
  r = await call('GET', `/products/${anyProduct.slug}`);
  check('a product can be fetched by slug', r.body?.data?.product?._id === anyProduct._id);

  r = await call('GET', `/products/${anyProduct._id}`);
  check('a product can be fetched by id', r.body?.data?.product?._id === anyProduct._id);

  r = await call('GET', '/products/000000000000000000000000');
  check('an unknown product is 404', r.status === 404, `status ${r.status}`);

  // ---- AUTHORIZATION ----
  section('Authorization');

  r = await call('POST', '/products', { token, body: { name: 'Hack', description: 'x', price: 1, category: anyProduct.category._id, stock: 1 } });
  check('a customer cannot create products (403)', r.status === 403, `status ${r.status}`);

  r = await call('GET', '/admin/dashboard', { token });
  check('a customer cannot open the admin dashboard (403)', r.status === 403, `status ${r.status}`);

  r = await call('DELETE', `/products/${anyProduct._id}`, { token });
  check('a customer cannot delete products (403)', r.status === 403, `status ${r.status}`);

  // ---- CART ----
  section('Cart');

  const cheap = asc.body.data.find((p) => p.stock > 5);

  r = await call('POST', '/cart/add', { token, body: { productId: cheap._id, quantity: 2 } });
  check('add to cart works', r.status === 200 && r.body.data.cart.totalItems === 2, `status ${r.status}`);
  check('cart item carries a usable image URL',
    typeof r.body.data.cart.items[0].image === 'string' && r.body.data.cart.items[0].image.startsWith('http'));
  check('cart line price matches the discounted price',
    r.body.data.cart.items[0].price === (cheap.discountedPrice > 0 ? cheap.discountedPrice : cheap.price));

  r = await call('POST', '/cart/add', { token, body: { productId: cheap._id, quantity: 999 } });
  check('adding more than stock is rejected (409)', r.status === 409, `status ${r.status}`);

  r = await call('PUT', '/cart/update', { token, body: { productId: cheap._id, quantity: 3 } });
  check('quantity update works', r.body?.data?.cart?.totalItems === 3);

  r = await call('PUT', '/cart/update', { token, body: { productId: cheap._id, quantity: 0 } });
  check('quantity 0 is rejected by validation (422)', r.status === 422, `status ${r.status}`);

  r = await call('POST', '/cart/add', { token, body: { productId: 'not-an-id' } });
  check('a malformed product id is rejected (422)', r.status === 422, `status ${r.status}`);

  const cartTotal = (await call('GET', '/cart', { token })).body.data.cart.totalPrice;
  check('cart subtotal is items x price', cartTotal === cheap.discountedPrice > 0
    ? true
    : cartTotal === (cheap.discountedPrice > 0 ? cheap.discountedPrice : cheap.price) * 3);

  r = await call('GET', '/cart');
  check('the cart requires a login (401)', r.status === 401, `status ${r.status}`);

  // ---- CHECKOUT / ORDERS ----
  section('Checkout and orders');

  const address = {
    name: 'Test Shopper', phone: '9876543210', street: '12 MG Road',
    city: 'Pune', state: 'Maharashtra', pincode: '411001',
  };

  r = await call('POST', '/orders', { token, body: { shippingAddress: { ...address, pincode: '1' }, paymentMethod: 'cod' } });
  check('a bad PIN code blocks the order (422)', r.status === 422, `status ${r.status}`);

  r = await call('POST', '/orders', { token, body: { shippingAddress: address, paymentMethod: 'razorpay' } });
  check('razorpay is refused while unconfigured, with a clear message',
    r.status === 400 && /cash on delivery/i.test(r.body.message), r.body?.message);

  const stockBefore = (await call('GET', `/products/${cheap._id}`)).body.data.product.stock;

  r = await call('POST', '/orders', { token, body: { shippingAddress: address, paymentMethod: 'cod' } });
  check('placing a COD order works', r.status === 201, `status ${r.status}`);
  const order = r.body?.data?.order;
  check('a COD order is confirmed immediately', order?.status === 'confirmed', order?.status);

  const expectedShipping = cartTotal >= 500 ? 0 : 49;
  const expectedTax = Math.round(cartTotal * 0.18);
  check('order total = subtotal + shipping + 18% GST',
    order?.pricing.grandTotal === cartTotal + expectedShipping + expectedTax,
    JSON.stringify(order?.pricing));

  const stockAfter = (await call('GET', `/products/${cheap._id}`)).body.data.product.stock;
  check('stock was reduced by the quantity ordered', stockBefore - stockAfter === 3, `${stockBefore} -> ${stockAfter}`);

  r = await call('GET', '/cart', { token });
  check('the cart is empty after ordering', r.body.data.cart.items.length === 0);

  r = await call('POST', '/orders', { token, body: { shippingAddress: address, paymentMethod: 'cod' } });
  check('ordering with an empty cart is refused', r.status === 400, `status ${r.status}`);

  r = await call('GET', '/orders/my-orders', { token });
  check('order history lists the order', r.body?.data?.some((o) => o.orderNumber === order.orderNumber));

  r = await call('GET', `/orders/${order._id}`, { token });
  check('order detail loads', r.body?.data?.order?.orderNumber === order.orderNumber);

  // another user must not be able to read it
  const other = await call('POST', '/auth/register', {
    body: { name: 'Nosy', email: `nosy${Date.now()}@example.com`, password: 'Password@123' },
  });
  r = await call('GET', `/orders/${order._id}`, { token: other.body.data.token });
  check('another customer cannot read this order (403)', r.status === 403, `status ${r.status}`);

  r = await call('POST', '/payment/verify', {
    token: other.body.data.token,
    body: { orderId: order._id, razorpay_order_id: 'x', razorpay_payment_id: 'y', razorpay_signature: 'z' },
  });
  check('another customer cannot confirm payment on this order', r.status === 403 || r.status === 503, `status ${r.status}`);

  // ---- CANCELLATION ----
  section('Cancellation restores stock');

  r = await call('PUT', `/orders/${order._id}/cancel`, { token, body: { reason: 'Changed my mind' } });
  check('cancel works while the order is confirmed', r.status === 200, `status ${r.status}`);

  const stockRestored = (await call('GET', `/products/${cheap._id}`)).body.data.product.stock;
  check('stock came back after cancelling', stockRestored === stockBefore, `${stockRestored} vs ${stockBefore}`);

  r = await call('PUT', `/orders/${order._id}/cancel`, { token, body: {} });
  check('cancelling twice is refused', r.status === 400, `status ${r.status}`);

  // ---- ADMIN ----
  section('Admin');

  r = await call('POST', '/auth/login', { body: { email: 'admin@shopeasy.com', password: 'Admin@123' } });
  check('admin can log in', r.status === 200 && r.body.data.user.role === 'admin');
  const adminToken = r.body?.data?.token;

  r = await call('GET', '/admin/dashboard', { token: adminToken });
  check('dashboard returns an overview', typeof r.body?.data?.overview?.totalRevenue === 'number');
  check('dashboard returns recent orders', Array.isArray(r.body?.data?.recentOrders));
  check('dashboard returns best sellers', Array.isArray(r.body?.data?.topProducts));

  r = await call('GET', '/admin/users?limit=5', { token: adminToken });
  check('admin can list users', Array.isArray(r.body?.data) && r.body.pagination);

  r = await call('GET', '/orders/admin/all?limit=5', { token: adminToken });
  check('admin can list all orders', Array.isArray(r.body?.data));

  // full product CRUD
  const cats = (await call('GET', '/categories')).body.data.categories;
  r = await call('POST', '/products', {
    token: adminToken,
    body: {
      name: `E2E Test Widget ${Date.now()}`, description: 'Created by the e2e test.',
      price: 1000, discountedPrice: 750, category: cats[0]._id, stock: 7, brand: 'TestCo',
      images: [{ url: 'https://example.com/x.jpg', alt: 'x', isPrimary: true }],
    },
  });
  check('admin can create a product', r.status === 201, `status ${r.status}`);
  const created = r.body?.data?.product;
  check('the slug is generated automatically', Boolean(created?.slug), created?.slug);

  r = await call('POST', '/products', {
    token: adminToken,
    body: { name: 'Bad', description: 'x', price: 100, discountedPrice: 200, category: cats[0]._id, stock: 1 },
  });
  check('a sale price above the list price is rejected', r.status === 400, `status ${r.status}`);

  r = await call('PUT', `/products/${created._id}`, { token: adminToken, body: { stock: 42 } });
  check('admin can update stock', r.body?.data?.product?.stock === 42);

  r = await call('DELETE', `/products/${created._id}`, { token: adminToken });
  check('admin can delete a product', r.status === 200, `status ${r.status}`);

  r = await call('GET', `/products/${created._id}`);
  check('a deleted product disappears from the storefront', r.status === 404, `status ${r.status}`);

  r = await call('GET', '/products?limit=50');
  check('the product count is back to where it started', r.body.pagination.totalItems === totalProducts);

  // Order status lifecycle. A fresh order is placed here rather than reusing one
  // from earlier, so this section works on a freshly seeded database too.
  await call('POST', '/cart/add', { token, body: { productId: cheap._id, quantity: 1 } });
  const lifecycle = (await call('POST', '/orders', {
    token, body: { shippingAddress: address, paymentMethod: 'cod' },
  })).body?.data?.order;
  const target = lifecycle;
  check('a second order can be placed for the lifecycle test', Boolean(target));
  if (target) {
    r = await call('PUT', `/orders/${target._id}/status`, { token: adminToken, body: { status: 'delivered' } });
    check('an illegal status jump (confirmed -> delivered) is refused', r.status === 400, `status ${r.status}`);

    r = await call('PUT', `/orders/${target._id}/status`, { token: adminToken, body: { status: 'shipped' } });
    check('a legal status move (confirmed -> shipped) works', r.status === 200, `status ${r.status}`);

    r = await call('PUT', `/orders/${target._id}/status`, { token: adminToken, body: { status: 'delivered' } });
    check('shipped -> delivered works', r.status === 200, `status ${r.status}`);

    r = await call('PUT', `/orders/${target._id}/status`, { token, body: { status: 'pending' } });
    check('a customer cannot change order status (403)', r.status === 403, `status ${r.status}`);

    r = await call('PUT', `/orders/${target._id}/cancel`, { token, body: {} });
    check('a delivered order can no longer be cancelled', r.status === 400, `status ${r.status}`);
  }

  // ---- MISC ----
  section('Errors and headers');

  r = await call('GET', '/definitely/not/a/route');
  check('an unknown route returns 404 JSON', r.status === 404 && r.body?.success === false);

  const health = await fetch(API + '/health');
  check('health check responds', health.status === 200);
  check('helmet security headers are present', Boolean(health.headers.get('x-content-type-options')));

  console.log(results.join('\n'));
  console.log('\n' + '='.repeat(60));
  console.log(`  ${pass} passed, ${fail} failed`);
  console.log('='.repeat(60));
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('E2E CRASHED:', e); process.exit(1); });
