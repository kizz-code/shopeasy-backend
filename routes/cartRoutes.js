// cartRoutes.js
const express = require("express");
const cartRouter = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require("../controllers/cartController");

cartRouter.use(protect); // All cart routes require authentication
cartRouter.get("/", getCart);
cartRouter.post("/add", addToCart);
cartRouter.put("/update", updateCartItem);
cartRouter.delete("/remove/:productId", removeFromCart);
cartRouter.delete("/clear", clearCart);

module.exports = cartRouter;
