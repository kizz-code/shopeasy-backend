# ShopEasy API Reference

Base URL: `http://localhost:5000/api`

---

## Conventions

**Every successful response:**

```json
{ "success": true, "message": "Products retrieved successfully", "data": { } }
```

**Every error:**

```json
{ "success": false, "message": "Only 3 available in stock." }
```

**Validation errors** add a per-field array:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email",    "message": "Enter a valid email" },
    { "field": "password", "message": "Password must be at least 6 characters" }
  ]
}
```

**Paginated responses** put the list in `data` and add `pagination`:

```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [ ],
  "pagination": {
    "currentPage": 2, "totalPages": 4, "totalItems": 12,
    "itemsPerPage": 3, "hasNextPage": true, "hasPrevPage": true
  }
}
```

**Authentication.** Protected endpoints need a bearer token:

```
Authorization: Bearer <token>
```

**Status codes**

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad request — the operation is not valid (e.g. an illegal status change) |
| 401 | Not authenticated — missing, invalid or expired token |
| 403 | Authenticated but not permitted (wrong role, or not your resource) |
| 404 | Not found |
| 409 | Conflict — duplicate email, or insufficient stock |
| 422 | Validation failed — see the `errors` array |
| 429 | Rate limit exceeded |
| 500 | Server error |

**Rate limits.** 300 requests per 15 minutes per IP across `/api`, and 10 *failed*
attempts per 15 minutes on `/api/auth/login` and `/api/auth/register`.

**Access column key:** `public` · `user` (any logged-in user) · `admin`

---

## Health

### `GET /api/health` — public

```json
{ "success": true, "message": "ShopEasy API is running",
  "environment": "development", "timestamp": "2026-08-18T11:54:43.723Z" }
```

---

## Authentication

### `POST /api/auth/register` — public

```json
{ "name": "John Doe", "email": "john@example.com",
  "password": "Password@123", "phone": "9876543210" }
```

| Field | Rules |
|-------|-------|
| `name` | required, max 50 characters |
| `email` | required, valid email, must not already exist |
| `password` | required, min 6 characters |
| `phone` | optional, exactly 10 digits |

**201** → `{ data: { user, token } }`  ·  **409** email taken  ·  **422** invalid input

### `POST /api/auth/login` — public

```json
{ "email": "john@example.com", "password": "Password@123" }
```

**200** → `{ data: { user, token } }`  ·  **401** wrong email or password
· **403** account deactivated

The 401 message is identical for an unknown email and a wrong password, so the
response cannot be used to discover which emails are registered.

### `GET /api/auth/me` — user

Returns the user the token belongs to. The frontend calls this on every page load
to confirm a stored token is still valid.

### `PUT /api/auth/profile` — user

```json
{ "name": "John D.", "phone": "9876543210" }
```

Email cannot be changed. **200** → `{ data: { user } }`

### `PUT /api/auth/change-password` — user

```json
{ "currentPassword": "Password@123", "newPassword": "NewPass@456" }
```

**200** → `{ data: { token } }` — a fresh token, so the session continues.
**400** current password incorrect · **422** new password too short

### `POST /api/auth/address` — user

```json
{ "label": "Home", "street": "12 MG Road", "city": "Pune",
  "state": "Maharashtra", "pincode": "411001", "isDefault": true }
```

`pincode` must be 6 digits. The first address saved becomes the default
automatically. **201** → `{ data: { addresses } }`

### `PUT /api/auth/address/:addressId` — user
### `DELETE /api/auth/address/:addressId` — user

Both return the full updated `addresses` array. Deleting the default promotes
whichever address remains first.

---

## Products

### `GET /api/products` — public

| Query | Type | Notes |
|-------|------|-------|
| `search` | string | Case-insensitive substring match on name, brand and tags |
| `category` | ObjectId | Category id |
| `minPrice` / `maxPrice` | number | Inclusive bounds |
| `brand` | string | Exact match, case-insensitive |
| `featured` | `"true"` | Featured products only |
| `page` | number | Defaults to 1 |
| `limit` | number | Defaults to 12, maximum 50 |
| `sort` | enum | `newest` (default), `price-asc`, `price-desc`, `rating`, `name` |

`sort` is matched against a fixed whitelist; an unrecognised value falls back to
`newest` rather than being passed to MongoDB.

```
GET /api/products?search=iph&sort=price-asc&page=1&limit=12
```

Returns a paginated list. Reviews are excluded from list responses.

**422** if `limit` is above 50, or `page` / `minPrice` / `maxPrice` are not numbers.

### `GET /api/products/featured` — public

Up to 8 featured products. Declared before `/:identifier` so "featured" is not
mistaken for a slug.

### `GET /api/products/:identifier` — public

Accepts a Mongo id **or** a slug:

```
GET /api/products/6a2940c5c09e14f711677704
GET /api/products/apple-iphone-15-pro
```

Includes reviews. **404** if not found or soft-deleted.

### `POST /api/products` — admin

```json
{
  "name": "Sony WH-1000XM5",
  "description": "Noise cancelling over-ear headphones.",
  "price": 34990,
  "discountedPrice": 29990,
  "category": "6a2940c5c09e14f7116776fd",
  "brand": "Sony",
  "stock": 80,
  "isFeatured": true,
  "images": [{ "url": "https://…", "alt": "Sony WH-1000XM5", "isPrimary": true }]
}
```

| Field | Rules |
|-------|-------|
| `name`, `description` | required |
| `price` | required, ≥ 0 |
| `discountedPrice` | optional, ≥ 0, must be **below** `price` |
| `category` | required, valid ObjectId |
| `stock` | required, integer ≥ 0 |

The slug is generated from the name. **201** · **400** sale price ≥ price ·
**403** not an admin · **422** invalid input

### `PUT /api/products/:id` — admin

Partial update — send only what changes. Same rules as create.

### `DELETE /api/products/:id` — admin

**Soft delete** — sets `isActive: false`. The product disappears from the
storefront but existing orders still resolve. **200**

### `POST /api/products/:id/reviews` — user

```json
{ "rating": 5, "comment": "Excellent build quality." }
```

`rating` must be 1–5. Recalculates the product's average.
**201** · **409** you already reviewed this product

---

## Categories

### `GET /api/categories` — public

```json
{ "success": true, "data": { "categories": [ ] } }
```

### `POST /api/categories` — admin
### `PUT /api/categories/:id` — admin
### `DELETE /api/categories/:id` — admin (soft delete)

---

## Cart

All cart endpoints require a login — there is no guest cart.

**Every cart endpoint returns the whole cart**, so the client can replace its state
with the response instead of re-fetching:

```json
{
  "success": true,
  "message": "Added to cart",
  "data": {
    "cart": {
      "items": [{
        "product": "6a2940c5c09e14f711677704",
        "slug": "apple-iphone-15-pro",
        "name": "Apple iPhone 15 Pro",
        "image": "https://…",
        "price": 134900,
        "quantity": 1,
        "stock": 50,
        "isAvailable": true
      }],
      "totalItems": 1,
      "totalPrice": 134900,
      "hasUnavailableItems": false
    }
  }
}
```

`price` is read live from the product on every request, so the cart never shows a
stale price. `totalPrice` excludes unavailable items.

### `GET /api/cart` — user
### `POST /api/cart/add` — user

```json
{ "productId": "6a2940…", "quantity": 2 }
```

**409** if the requested quantity — added to whatever is already in the cart —
exceeds stock. The message says how many are actually available.

### `PUT /api/cart/update` — user

```json
{ "productId": "6a2940…", "quantity": 3 }
```

`quantity` must be at least 1; use remove to delete a line.
**409** above stock · **404** not in the cart

### `DELETE /api/cart/remove/:productId` — user
### `DELETE /api/cart/clear` — user

---

## Orders

### `POST /api/orders` — user

Turns the cart into an order.

```json
{
  "shippingAddress": {
    "name": "John Doe", "phone": "9876543210", "street": "12 MG Road",
    "city": "Pune", "state": "Maharashtra", "pincode": "411001"
  },
  "paymentMethod": "cod",
  "notes": "Leave at reception"
}
```

| Field | Rules |
|-------|-------|
| `shippingAddress.name`, `.street`, `.city`, `.state` | required |
| `shippingAddress.phone` | exactly 10 digits |
| `shippingAddress.pincode` | exactly 6 digits |
| `paymentMethod` | `cod` (default) or `razorpay` |

**Pricing is calculated server-side** and never taken from the request:

```
shipping  = 0 if subtotal >= ₹500, otherwise ₹49
tax       = round(subtotal × 0.18)
total     = subtotal + shipping + tax
```

Item prices are re-read from each product at order time, not taken from the cart.

**201**

```json
{ "data": { "order": {
  "_id": "…", "orderNumber": "SE-635640071", "status": "confirmed",
  "paymentMethod": "cod",
  "pricing": { "itemsTotal": 29997, "shippingCharge": 0,
               "taxAmount": 5399, "discount": 0, "grandTotal": 35396 }
}}}
```

A `cod` order is `confirmed` straight away. A `razorpay` order starts as `pending`
until payment is verified.

**Errors**

| Code | When |
|------|------|
| 400 | Cart is empty — also what a duplicate submission gets |
| 400 | `razorpay` requested while online payment is not configured |
| 409 | A product ran out of stock, or went inactive, between cart and checkout |
| 422 | Address validation failed |

Two behaviours worth knowing:

- **Duplicate submissions.** The cart is claimed atomically — read and emptied in a
  single operation — so a double-clicked button produces one order; the second
  request finds an empty cart and gets a 400.
- **Stock.** Each item's stock check and decrement happen in one atomic update, so
  concurrent buyers cannot oversell. If a later item fails, stock already taken is
  returned and the cart is restored.

### `GET /api/orders/my-orders` — user

| Query | Notes |
|-------|-------|
| `page` | Defaults to 1 |
| `limit` | Defaults to 10, max 50 |
| `status` | Optional filter |

Returns a lightweight projection — order number, status, pricing, item count and
the first item — rather than every item, since the list only shows a summary.

### `GET /api/orders/:id` — user (owner) or admin

Full order including all items, address, payment and `statusHistory`.
**403** if the order belongs to someone else.

### `PUT /api/orders/:id/cancel` — user (owner)

```json
{ "reason": "Changed my mind" }
```

Allowed while the order is `pending` or `confirmed`. Returns all items to stock.
**400** if already shipped, delivered or cancelled.

### `GET /api/orders/admin/all` — admin

| Query | Notes |
|-------|-------|
| `page`, `limit` | `limit` defaults to 20, max 50 |
| `status` | Optional filter |
| `search` | Partial order number match |

### `PUT /api/orders/:id/status` — admin

```json
{ "status": "shipped", "note": "Handed to courier" }
```

**Only legal transitions are accepted:**

```
pending    →  confirmed, cancelled
confirmed  →  shipped, cancelled
shipped    →  delivered
delivered  →  (final)
cancelled  →  (final)
```

Anything else is **400** with a message naming the allowed moves. Setting
`delivered` stamps `deliveredAt`; setting `cancelled` returns stock.

---

## Payment (optional)

Online payment only works when real Razorpay keys are configured. Otherwise these
endpoints return **503** and the checkout page offers cash on delivery only.

### `GET /api/payment/config` — user

```json
{ "data": { "onlinePaymentEnabled": false, "keyId": null } }
```

The checkout page calls this to decide whether to show the online option.

### `POST /api/payment/create-order` — user

```json
{ "orderId": "6a844a2bcdf2c78439835930" }
```

Creates a Razorpay order for the amount already stored on our order — the client
does not get to name the amount. **403** if the order is not yours ·
**409** already paid

### `POST /api/payment/verify` — user

```json
{ "razorpay_order_id": "order_…", "razorpay_payment_id": "pay_…",
  "razorpay_signature": "…", "orderId": "6a844a…" }
```

Two checks before the order is marked paid:

1. `razorpay_order_id` must match the one stored on this order — this stops a valid
   payment from a different, cheaper order being replayed here.
2. `HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)` must
   equal `razorpay_signature`.

The browser is never trusted to report that a payment succeeded.

**200** order becomes `confirmed` · **400** signature or order mismatch ·
**403** not your order

### `POST /api/payment/failure` — user

Records a failed or abandoned attempt so the order can be paid for later.

---

## Admin

### `GET /api/admin/dashboard` — admin

One response built from several aggregation pipelines running in parallel:

```json
{ "data": {
  "overview": {
    "totalUsers": 2, "totalProducts": 12,
    "totalRevenue": 199296, "totalOrders": 2, "avgOrderValue": 99648,
    "last30Days": { "revenue": 199296, "orders": 2 },
    "last7Days":  { "revenue": 199296, "orders": 2 }
  },
  "recentOrders": [ ],
  "topProducts": [ ],
  "revenueTrend": [{ "_id": "2026-08-18", "revenue": 199296, "orders": 2 }],
  "ordersByStatus": [{ "_id": "confirmed", "count": 2 }]
}}
```

### `GET /api/admin/users` — admin

| Query | Notes |
|-------|-------|
| `page`, `limit` | Pagination |
| `search` | Matches name or email |
| `role` | `customer` or `admin` |

### `PUT /api/admin/users/:id/toggle-status` — admin

Flips `isActive`. A deactivated user's existing tokens stop working, because
`protect` re-checks the flag on every request.
**400** admin accounts cannot be deactivated.

---

## Testing the API

`backend/tests/e2e.js` exercises every endpoint above, including the failure paths.

```bash
cd backend
npm run dev          # terminal 1
npm run test:e2e     # terminal 2
```
