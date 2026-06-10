/**
 * Payment Controller
 * Razorpay payment gateway integration
 *
 * Flow:
 * 1. Frontend calls /create-order → Backend creates Razorpay order → Returns order_id
 * 2. Frontend opens Razorpay checkout UI with order_id
 * 3. User completes payment → Razorpay returns payment_id + signature
 * 4. Frontend calls /verify → Backend verifies HMAC signature → Marks order as paid
 */

const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");
const { createError } = require("../utils/apiError");
const { successResponse } = require("../utils/apiResponse");

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * @desc    Create Razorpay order for payment
 * @route   POST /api/payment/create-order
 * @access  Private
 */
const createRazorpayOrder = async (req, res, next) => {
  const { orderId } = req.body;

  // Fetch our order from DB
  const order = await Order.findById(orderId);
  if (!order) return next(createError("Order not found.", 404));

  if (order.user.toString() !== req.user._id.toString()) {
    return next(createError("Access denied.", 403));
  }

  if (order.payment.status === "completed") {
    return next(createError("This order has already been paid.", 400));
  }

  // Create Razorpay order
  // Amount must be in paise (INR × 100)
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(order.pricing.grandTotal * 100), // Convert to paise
    currency: "INR",
    receipt: order.orderNumber,
    notes: {
      orderId: order._id.toString(),
      userId: req.user._id.toString(),
    },
  });

  // Save Razorpay order ID to our order
  order.payment.razorpay_order_id = razorpayOrder.id;
  await order.save({ validateBeforeSave: false });

  return successResponse(res, "Payment order created", {
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    orderNumber: order.orderNumber,
  });
};

/**
 * @desc    Verify payment signature and confirm order
 * @route   POST /api/payment/verify
 * @access  Private
 *
 * Security: HMAC-SHA256 signature verification prevents payment tampering
 * The signature is: HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
 */
const verifyPayment = async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  // ─── HMAC Signature Verification ─────────────────────────────────────────
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    // Signature mismatch = payment tampered or invalid
    return next(createError("Payment verification failed. Invalid signature.", 400));
  }

  // ─── Update Order ─────────────────────────────────────────────────────────
  const order = await Order.findById(orderId);
  if (!order) return next(createError("Order not found.", 404));

  order.payment = {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    status: "completed",
    paidAt: new Date(),
  };
  order.status = "confirmed";
  order.statusHistory.push({
    status: "confirmed",
    note: `Payment completed. Payment ID: ${razorpay_payment_id}`,
  });

  await order.save();

  return successResponse(res, "Payment verified successfully! Your order is confirmed.", {
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paidAt: order.payment.paidAt,
    },
  });
};

/**
 * @desc    Handle payment failure (log it)
 * @route   POST /api/payment/failure
 * @access  Private
 */
const handlePaymentFailure = async (req, res, next) => {
  const { orderId, razorpay_order_id, error } = req.body;

  const order = await Order.findById(orderId);
  if (!order) return next(createError("Order not found.", 404));

  order.payment.razorpay_order_id = razorpay_order_id;
  order.payment.status = "failed";
  order.statusHistory.push({
    status: "pending",
    note: `Payment failed: ${error?.description || "Unknown error"}`,
  });

  await order.save({ validateBeforeSave: false });

  return successResponse(res, "Payment failure logged. You can retry payment.", {
    orderId: order._id,
    orderNumber: order.orderNumber,
  });
};

module.exports = { createRazorpayOrder, verifyPayment, handlePaymentFailure };
