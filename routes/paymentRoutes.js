const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { createRazorpayOrder, verifyPayment, handlePaymentFailure } = require("../controllers/paymentController");

router.use(protect);
router.post("/create-order", createRazorpayOrder);
router.post("/verify", verifyPayment);
router.post("/failure", handlePaymentFailure);

module.exports = router;
