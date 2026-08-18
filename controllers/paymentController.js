/**
 * Razorpay payment flow (optional - cash on delivery works without any of this):
 *
 * 1. Frontend calls /create-order      -> we create a Razorpay order and return its id
 * 2. Frontend opens the Razorpay popup with that id
 * 3. Razorpay hands back a payment id and a signature
 * 4. Frontend calls /verify            -> we recompute the signature and confirm the order
 *
 * Step 4 is the important one: the browser is not trusted to tell us a payment
 * succeeded. We recompute the HMAC with our secret key and only believe it if it matches.
 */

const Razorpay = require("razorpay");
const crypto = require("crypto");
const Order = require("../models/Order");
const { createError } = require("../utils/apiError");
const { successResponse } = require("../utils/apiResponse");

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// The repo ships with placeholder keys so the project runs out of the box. Until
// real keys are set we keep online payment switched off rather than failing
// halfway through a checkout.
const isConfigured = Boolean(
  KEY_ID && KEY_SECRET && !KEY_ID.startsWith("your_") && !KEY_SECRET.startsWith("your_")
);

const razorpay = isConfigured
  ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET })
  : null;

const requireConfigured = (next) => {
  if (isConfigured) return false;
  next(createError("Online payment is not configured on this server. Please use cash on delivery.", 503));
  return true;
};

// Loads an order and refuses it if it belongs to somebody else.
const findOwnedOrder = async (orderId, user) => {
  const order = await Order.findById(orderId);
  if (!order) throw createError("Order not found.", 404);
  if (order.user.toString() !== user._id.toString()) {
    throw createError("Access denied.", 403);
  }
  return order;
};

/**
 * GET /api/payment/config
 * Lets the checkout page know whether to offer online payment at all.
 */
const getPaymentConfig = (req, res) =>
  successResponse(res, "Payment config", {
    onlinePaymentEnabled: isConfigured,
    keyId: isConfigured ? KEY_ID : null,
  });

/**
 * POST /api/payment/create-order
 */
const createRazorpayOrder = async (req, res, next) => {
  if (requireConfigured(next)) return;

  const order = await findOwnedOrder(req.body.orderId, req.user);

  if (order.payment.status === "completed") {
    return next(createError("This order has already been paid for.", 409));
  }
  if (order.status === "cancelled") {
    return next(createError("This order was cancelled and cannot be paid for.", 400));
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(order.pricing.grandTotal * 100), // Razorpay works in paise
    currency: "INR",
    receipt: order.orderNumber,
    notes: { orderId: order._id.toString() },
  });

  order.payment.razorpay_order_id = razorpayOrder.id;
  await order.save({ validateBeforeSave: false });

  return successResponse(res, "Payment order created", {
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: KEY_ID,
    orderNumber: order.orderNumber,
  });
};

/**
 * POST /api/payment/verify
 */
const verifyPayment = async (req, res, next) => {
  if (requireConfigured(next)) return;

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  const order = await findOwnedOrder(orderId, req.user);

  // The signature is tied to the Razorpay order we created for THIS order. Checking
  // it stops someone replaying a valid payment from a different, cheaper order.
  if (order.payment.razorpay_order_id !== razorpay_order_id) {
    return next(createError("This payment does not belong to the given order.", 400));
  }

  const expectedSignature = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return next(createError("Payment verification failed. Invalid signature.", 400));
  }

  order.payment.razorpay_payment_id = razorpay_payment_id;
  order.payment.razorpay_signature = razorpay_signature;
  order.payment.status = "completed";
  order.payment.paidAt = new Date();
  order.status = "confirmed";
  order.statusHistory.push({
    status: "confirmed",
    note: `Payment received (${razorpay_payment_id})`,
  });

  await order.save();

  return successResponse(res, "Payment verified. Your order is confirmed!", {
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paidAt: order.payment.paidAt,
    },
  });
};

/**
 * POST /api/payment/failure
 * Records that an attempt did not go through so the user can retry from order history.
 */
const handlePaymentFailure = async (req, res, next) => {
  const order = await findOwnedOrder(req.body.orderId, req.user);

  order.payment.status = "failed";
  order.statusHistory.push({
    status: order.status,
    note: `Payment attempt failed: ${req.body.error?.description || "cancelled by user"}`,
  });

  await order.save({ validateBeforeSave: false });

  return successResponse(res, "Payment attempt recorded. You can try again.", {
    orderId: order._id,
    orderNumber: order.orderNumber,
  });
};

module.exports = {
  getPaymentConfig,
  createRazorpayOrder,
  verifyPayment,
  handlePaymentFailure,
  isOnlinePaymentEnabled: () => isConfigured,
};
