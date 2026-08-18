const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  productRules, productUpdateRules, reviewRules, mongoIdParam, productQueryRules,
} = require("../middleware/validators");
const {
  getProducts, getProduct, getFeaturedProducts,
  createProduct, updateProduct, deleteProduct, addReview,
} = require("../controllers/productController");

// "featured" has to be declared before ":identifier", otherwise it would be
// treated as a slug and never reach this handler.
router.get("/featured", getFeaturedProducts);
router.get("/", productQueryRules, validate, getProducts);
router.get("/:identifier", getProduct);

router.post("/", protect, authorize("admin"), productRules, validate, createProduct);
router.put("/:id", protect, authorize("admin"), productUpdateRules, validate, updateProduct);
router.delete("/:id", protect, authorize("admin"), mongoIdParam(), validate, deleteProduct);

router.post("/:id/reviews", protect, reviewRules, validate, addReview);

module.exports = router;
