const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getPaymentConfig, createRazorpayOrder, verifyPayment, handlePaymentFailure,
} = require("../controllers/paymentController");

router.use(protect);

router.get("/config", getPaymentConfig);
router.post("/create-order", createRazorpayOrder);
router.post("/verify", verifyPayment);
router.post("/failure", handlePaymentFailure);

module.exports = router;
