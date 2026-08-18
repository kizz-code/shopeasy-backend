const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { createError } = require("../utils/apiError");
const { successResponse, paginatedResponse } = require("../utils/apiResponse");
const { calculatePricing } = require("../utils/pricing");
const { isOnlinePaymentEnabled } = require("./paymentController");

// A customer can only back out while the order has not shipped.
const CANCELLABLE = ["pending", "confirmed"];

// Where an admin is allowed to move an order next.
const NEXT_STATUS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

// Gives back stock that was already taken when a later item in the same order fails.
const restoreStock = (items) =>
  Promise.all(
    items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } }))
  );

/**
 * POST /api/orders
 * Turns the user's cart into an order.
 */
const placeOrder = async (req, res, next) => {
  const { shippingAddress, paymentMethod = "cod", notes } = req.body;

  if (paymentMethod === "razorpay" && !isOnlinePaymentEnabled()) {
    return next(createError("Online payment is not available. Please choose cash on delivery.", 400));
  }

  // Claim the cart in one atomic step: we read the items and empty it in the same
  // operation. If the user double-clicks "Place order", only the first request gets
  // items back - the second finds an empty cart and is rejected. That is our
  // duplicate-order protection, and it needs no extra bookkeeping.
  const claimedCart = await Cart.findOneAndUpdate(
    { user: req.user._id, "items.0": { $exists: true } },
    { $set: { items: [] } }
  );

  if (!claimedCart) {
    return next(createError("Your cart is empty. Add items before placing an order.", 400));
  }

  const cartItems = claimedCart.items;
  const takenStock = [];

  try {
    const orderItems = [];

    // One product at a time, so we know exactly what to give back if something fails.
    for (const item of cartItems) {
      // The filter does the stock check and the decrement in a single atomic update,
      // so two people buying the last unit cannot both succeed.
      const product = await Product.findOneAndUpdate(
        { _id: item.product, isActive: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!product) {
        const current = await Product.findById(item.product).select("name stock isActive");
        throw createError(
          !current || !current.isActive
            ? `"${item.name}" is no longer available.`
            : `Only ${current.stock} left of "${current.name}". Please update your cart.`,
          409
        );
      }

      takenStock.push({ product: product._id, quantity: item.quantity });

      // Price comes from the product, not from the cart snapshot, so a stale or
      // tampered cart cannot change what the customer is charged.
      const price = product.discountedPrice > 0 ? product.discountedPrice : product.price;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: item.image,
        price,
        quantity: item.quantity,
      });
    }

    const itemsTotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const pricing = calculatePricing(itemsTotal);

    // Cash on delivery has nothing to pay online, so it is confirmed straight away.
    const isCod = paymentMethod === "cod";

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      pricing,
      notes,
      status: isCod ? "confirmed" : "pending",
      statusHistory: [
        { status: "pending", note: "Order placed" },
        ...(isCod ? [{ status: "confirmed", note: "Cash on delivery selected" }] : []),
      ],
    });

    return successResponse(
      res,
      isCod ? "Order placed successfully!" : "Order created. Complete payment to confirm.",
      {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentMethod: order.paymentMethod,
          pricing: order.pricing,
        },
      },
      201
    );
  } catch (err) {
    // Put the stock and the cart back so a failed attempt costs the user nothing.
    await restoreStock(takenStock);
    await Cart.updateOne({ user: req.user._id }, { $set: { items: cartItems } });
    return next(err);
  }
};

/**
 * GET /api/orders/my-orders
 * Order history for the logged-in user. One aggregation returns the page of orders
 * and the total count together, so the list and its pagination cost a single trip.
 */
const getMyOrders = async (req, res) => {
  const { status } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

  const [result] = await Order.aggregate([
    { $match: { user: req.user._id, ...(status && { status }) } },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        orders: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
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
  ]);

  const totalItems = result.totalCount[0]?.count || 0;

  return paginatedResponse(res, "Orders retrieved successfully", result.orders, {
    page,
    totalPages: Math.ceil(totalItems / limit),
    totalItems,
    limit,
  });
};

/**
 * GET /api/orders/:id
 */
const getOrderById = async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) return next(createError("Order not found.", 404));

  const isOwner = order.user._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    return next(createError("Access denied.", 403));
  }

  return successResponse(res, "Order retrieved successfully", { order });
};

/**
 * PUT /api/orders/:id/cancel
 */
const cancelOrder = async (req, res, next) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) return next(createError("Order not found.", 404));
  if (order.user.toString() !== req.user._id.toString()) {
    return next(createError("Access denied.", 403));
  }
  if (!CANCELLABLE.includes(order.status)) {
    return next(createError(`An order that is already ${order.status} cannot be cancelled.`, 400));
  }

  order.status = "cancelled";
  order.cancelledAt = new Date();
  order.cancellationReason = reason || "Cancelled by customer";
  order.statusHistory.push({
    status: "cancelled",
    note: order.cancellationReason,
    updatedBy: req.user._id,
  });

  await order.save();
  await restoreStock(order.items);

  return successResponse(res, "Order cancelled successfully", { order });
};

/**
 * GET /api/orders/admin/all
 */
const getAllOrdersAdmin = async (req, res) => {
  const { status, search } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

  const query = {
    ...(status && { status }),
    ...(search && { orderNumber: { $regex: search.trim(), $options: "i" } }),
  };

  const [orders, totalItems] = await Promise.all([
    Order.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ]);

  return paginatedResponse(res, "Orders retrieved", orders, {
    page,
    totalPages: Math.ceil(totalItems / limit),
    totalItems,
    limit,
  });
};

/**
 * PUT /api/orders/:id/status
 * Admins move an order along: pending -> confirmed -> shipped -> delivered.
 */
const updateOrderStatus = async (req, res, next) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) return next(createError("Order not found.", 404));

  const allowed = NEXT_STATUS[order.status] || [];
  if (!allowed.includes(status)) {
    return next(
      createError(
        allowed.length
          ? `An order that is ${order.status} can only move to: ${allowed.join(", ")}.`
          : `An order that is ${order.status} cannot be updated any further.`,
        400
      )
    );
  }

  order.status = status;
  order.statusHistory.push({
    status,
    note: note || `Marked as ${status}`,
    updatedBy: req.user._id,
  });

  if (status === "delivered") order.deliveredAt = new Date();
  if (status === "cancelled") {
    order.cancelledAt = new Date();
    await restoreStock(order.items);
  }

  await order.save();

  return successResponse(res, `Order marked as ${status}`, { order });
};

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrdersAdmin,
  updateOrderStatus,
};
