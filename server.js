require("dotenv").config();
require("express-async-errors"); // lets async controllers throw without try/catch

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

app.use(helmet());

// Browsing generates a lot of requests, so the general cap is loose. Login and
// register get a much tighter one of their own, since that is where password
// guessing would happen. The cap is raised in development, where a demo or a
// test run would otherwise trip it.
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 300 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again in a few minutes." },
  })
);

app.use(
  ["/api/auth/login", "/api/auth/register"],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 10 : 100,
    skipSuccessfulRequests: true, // only failed attempts count towards the limit
    message: { success: false, message: "Too many login attempts. Please try again later." },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (!isProduction) app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ShopEasy API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);

// These two go last: anything that did not match a route above falls through to
// notFound, and every error raised anywhere ends up in errorHandler.
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect before listening, so the server never accepts a request it cannot serve.
const start = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  await connectDB();

  app.listen(PORT, () => {
    console.log(`ShopEasy API listening on http://localhost:${PORT}/api`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
};

start();

module.exports = app;
