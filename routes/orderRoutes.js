const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { placeOrderRules, orderStatusRules, mongoIdParam } = require("../middleware/validators");
const {
  placeOrder, getMyOrders, getOrderById, cancelOrder,
  getAllOrdersAdmin, updateOrderStatus,
} = require("../controllers/orderController");

router.use(protect);

router.post("/", placeOrderRules, validate, placeOrder);
router.get("/my-orders", getMyOrders);

// Admin routes are declared before "/:id" so that "admin" is not read as an order id.
router.get("/admin/all", authorize("admin"), getAllOrdersAdmin);
router.put("/:id/status", authorize("admin"), orderStatusRules, validate, updateOrderStatus);

router.get("/:id", mongoIdParam(), validate, getOrderById);
router.put("/:id/cancel", mongoIdParam(), validate, cancelOrder);

module.exports = router;
