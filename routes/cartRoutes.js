const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { cartAddRules, cartUpdateRules, mongoIdParam } = require("../middleware/validators");
const {
  getCart, addToCart, updateCartItem, removeFromCart, clearCart,
} = require("../controllers/cartController");

router.use(protect); // there is no such thing as a guest cart here

router.get("/", getCart);
router.post("/add", cartAddRules, validate, addToCart);
router.put("/update", cartUpdateRules, validate, updateCartItem);
router.delete("/clear", clearCart);
router.delete("/remove/:productId", mongoIdParam("productId"), validate, removeFromCart);

module.exports = router;
