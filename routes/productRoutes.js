const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getProducts, getProduct, createProduct, updateProduct,
  deleteProduct, getFeaturedProducts, addReview,
} = require("../controllers/productController");

router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/:identifier", getProduct);

// Admin only
router.post("/", protect, authorize("admin"), createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

// Authenticated users
router.post("/:id/reviews", protect, addReview);

module.exports = router;
