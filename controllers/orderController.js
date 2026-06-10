/**
 * Order Controller
 * Place orders, track history, and run analytics via aggregation pipelines
 */

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { createError } = require("../utils/apiError");
const { successResponse, paginatedResponse } = require("../utils/apiResponse");

/**
 * @desc    Place a new order
 * @route   POST /api/orders
 * @access  Private
 */
const placeOrder = async (req, res, next) => {
  const { shippingAddress, paymentMethod = "razorpay", notes } = req.body;

  // Get user's cart
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    return next(createError("Your cart is empty. Add items before placing an order.", 400));
  }

  // Validate stock for all items simultaneously
  const stockChecks = await Promise.all(
    cart.items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return { valid: false, message: `Product "${item.name}" is no longer available.` };
      }
      if (product.stock < item.quantity) {
        return {
          valid: false,
          message: `Insufficient stock for "${item.name}". Available: ${product.stock}`,
        };
      }
      return { valid: true, product, item };
    })
  );

  const invalidItem = stockChecks.find((check) => !check.valid);
  if (invalidItem) return next(createError(invalidItem.message, 400));

  // Calculate pricing
  const itemsTotal = cart.totalPrice;
  const shippingCharge = itemsTotal > 500 ? 0 : 49; // Free shipping above ₹500
  const taxAmount = Math.round(itemsTotal * 0.18); // 18% GST
  const grandTotal = itemsTotal + shippingCharge + taxAmount;

  // Build order items from cart
  const orderItems = cart.items.map((item) => ({
    product: item.product,
    name: item.name,
    image: item.image,
    price: item.price,
    quantity: item.quantity,
  }));

  // Create the order
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    pricing: { itemsTotal, shippingCharge, taxAmount, discount: 0, grandTotal },
    notes,
    statusHistory: [{ status: "pending", note: "Order placed successfully" }],
  });

  // Deduct stock for each product
  await Promise.all(
    stockChecks.map(({ product, item }) =>
      Product.findByIdAndUpdate(product._id, { $inc: { stock: -item.quantity } })
    )
  );

  // Clear the cart after successful order
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

  return successResponse(
    res,
    "Order placed successfully! Complete payment to confirm.",
    { order: { _id: order._id, orderNumber: order.orderNumber, grandTotal, status: order.status } },
    201
  );
};

/**
 * @desc    Get user's order history
 * @route   GET /api/orders/my-orders
 * @access  Private
 *
 * Uses MongoDB Aggregation Pipeline for efficient data retrieval with pagination
 */
const getMyOrders = async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // ─── Aggregation Pipeline ─────────────────────────────────────────────────
  const pipeline = [
    // Stage 1: Filter by user
    { $match: { user: req.user._id, ...(status && { status }) } },

    // Stage 2: Sort newest first
    { $sort: { createdAt: -1 } },

    // Stage 3: Facet for data + total count in one query
    {
      $facet: {
        orders: [
          { $skip: skip },
          { $limit: limitNum },
          {
            $project: {
              orderNumber: 1, status: 1, pricing: 1, paymentMethod: 1,
              "payment.status": 1, createdAt: 1,
              itemCount: { $size: "$items" },
              firstItem: { $arrayElemAt: ["$items", 0] },
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await Order.aggregate(pipeline);
  const orders = result.orders;
  const totalItems = result.totalCount[0]?.count || 0;
  const totalPages = Math.ceil(totalItems / limitNum);

  return paginatedResponse(res, "Orders retrieved successfully", orders, {
    page: pageNum, totalPages, totalItems, limit: limitNum,
  });
};

/**
 * @desc    Get single order details
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");

  if (!order) return next(createError("Order not found.", 404));

  // Customers can only view their own orders
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return next(createError("Access denied.", 403));
  }

  return successResponse(res, "Order retrieved successfully", { order });
};

/**
 * @desc    Cancel an order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = async (req, res, next) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) return next(createError("Order not found.", 404));

  if (order.user.toString() !== req.user._id.toString()) {
    return next(createError("Access denied.", 403));
  }

  const cancellableStatuses = ["pending", "confirmed"];
  if (!cancellableStatuses.includes(order.status)) {
    return next(createError(`Cannot cancel an order with status: ${order.status}`, 400));
  }

  order.status = "cancelled";
  order.cancelledAt = new Date();
  order.cancellationReason = reason || "Cancelled by customer";
  order.statusHistory.push({ status: "cancelled", note: reason, updatedBy: req.user._id });

  // Restore stock
  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
    )
  );

  await order.save();

  return successResponse(res, "Order cancelled successfully", { order });
};

/**
 * @desc    Admin: Get all orders with analytics
 * @route   GET /api/orders/admin/all
 * @access  Private/Admin
 *
 * Uses MongoDB Aggregation Pipeline for sales analytics
 */
const getAllOrdersAdmin = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const matchStage = status ? { status } : {};

  const [ordersResult, analyticsResult] = await Promise.all([
    // Paginated orders list
    Order.find(matchStage)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),

    // ─── Aggregation Pipeline: Sales Analytics ─────────────────────────────
    Order.aggregate([
      { $match: { status: { $nin: ["cancelled"] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$pricing.grandTotal" },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: "$pricing.grandTotal" },
          totalItems: { $sum: { $size: "$items" } },
        },
      },
    ]),
  ]);

  const totalItems = await Order.countDocuments(matchStage);

  return paginatedResponse(
    res,
    "Orders retrieved",
    { orders: ordersResult, analytics: analyticsResult[0] || {} },
    { page: pageNum, totalPages: Math.ceil(totalItems / limitNum), totalItems, limit: limitNum }
  );
};

/**
 * @desc    Admin: Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Private/Admin
 */
const updateOrderStatus = async (req, res, next) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) return next(createError("Order not found.", 404));

  order.status = status;
  order.statusHistory.push({ status, note: note || `Status updated to ${status}`, updatedBy: req.user._id });

  if (status === "delivered") order.deliveredAt = new Date();

  await order.save();

  return successResponse(res, "Order status updated", { order });
};

module.exports = {
  placeOrder, getMyOrders, getOrderById, cancelOrder,
  getAllOrdersAdmin, updateOrderStatus,
};
