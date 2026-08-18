# ShopEasy — API

REST API for ShopEasy, a full-stack e-commerce store. Node.js, Express and MongoDB.

The React frontend lives in a separate repository:
**[kizz-code/shopeasy-frontend](https://github.com/kizz-code/shopeasy-frontend)**

---

## What it does

- JWT authentication with `customer` and `admin` roles
- Product catalogue with server-side search, filtering, sorting and pagination
- Server-side cart, so prices and stock are checked by code the browser cannot touch
- Order placement with atomic stock handling and duplicate-submission protection
- Admin endpoints for product CRUD, order status and user management
- Optional Razorpay payment, with cash on delivery as the default

## Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | `jsonwebtoken` + `bcryptjs` |
| Validation | `express-validator` |
| Security | `helmet`, `express-rate-limit`, CORS |

## Getting started

```bash
npm install
cp .env.example .env     # fill in MONGODB_URI and JWT_SECRET
npm run seed             # 5 categories, 32 products, 2 demo accounts
npm run dev              # http://localhost:5000
```

Demo accounts created by the seeder:

| Role | Email | Password |
|---|---|---|
| Admin | admin@shopeasy.com | Admin@123 |
| Customer | john@example.com | Password@123 |

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start with nodemon |
| `npm start` | Start with node |
| `npm run seed` | Wipe and refill the database |
| `npm run test:e2e` | End-to-end check of every flow (server must be running) |
| `npm run test:routes` | Check every frontend API call against the real route table |

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | **yes** | Server refuses to start without it |
| `JWT_SECRET` | **yes** | Any long random string |
| `PORT` | no | Defaults to 5000 |
| `NODE_ENV` | no | `production` hides stack traces and tightens rate limits |
| `JWT_EXPIRE` | no | Defaults to `7d` |
| `FRONTEND_URL` | no | CORS origin, defaults to `http://localhost:5173` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | no | Leave unset to run cash-on-delivery only |

`.env` is gitignored. Only `.env.example` is tracked.

## Structure

```
config/         MongoDB connection
controllers/    request handling and business logic
middleware/     auth, validation, centralised error handling
models/         Mongoose schemas
routes/         URL -> middleware -> controller
utils/          error/response helpers, pricing rules, seeder
tests/          end-to-end and route-map checks
server.js       app setup, middleware order, startup
```

Every request follows the same path:

```
Route -> validation -> protect (JWT) -> authorize (role) -> controller -> model -> MongoDB
```

There is one error handler and one response shape. Controllers never build error
JSON themselves; they call `next(createError(message, status))` or throw, and
`middleware/errorMiddleware.js` turns that into a response.

## Response shape

```json
{ "success": true, "message": "...", "data": { } }
```

Errors use the same shape with `success: false`, and validation failures add an
`errors` array with one entry per field.

Full endpoint reference: **[API_DOCS.md](API_DOCS.md)**

## Notes on a few decisions

**Stock is decremented atomically.** The stock check and the decrement happen in a
single conditional update, so two people buying the last unit cannot both succeed:

```js
await Product.findOneAndUpdate(
  { _id, isActive: true, stock: { $gte: quantity } },
  { $inc: { stock: -quantity } }
);
```

**Duplicate orders are prevented by claiming the cart.** The order is built from
the cart, and the cart is read and emptied in one operation. A double-clicked
"Place order" finds an empty cart on the second request and is rejected.

**Order items are stored as copies, not references.** An order must show what was
actually paid, so changing a product's price later cannot rewrite history.

**Search uses a case-insensitive regex, not a text index.** A text index only
matches whole words, so typing "iph" would find nothing — wrong for a
search-as-you-type box. The trade-off is that an unanchored regex cannot use an
index, so at a much larger catalogue this would move to Atlas Search.

**Indexes exist only where a query needs them.** `{ isActive, category, price }`
covers the browsing query, `{ isActive, isFeatured }` the homepage strip,
`{ user, createdAt }` order history.

## Limitations

- No image upload; products take an image URL
- No email (order confirmations, password reset)
- JWT in `localStorage` on the client, not an httpOnly cookie
- No refresh tokens
- Reviews are not restricted to verified purchases
