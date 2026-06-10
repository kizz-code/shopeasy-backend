const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  placeOrder, getMyOrders, getOrderById, cancelOrder,
  getAllOrdersAdmin, updateOrderStatus,
} = require("../controllers/orderController");

router.use(protect);

router.post("/", placeOrder);
router.get("/my-orders", getMyOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);

// Admin
router.get("/admin/all", authorize("admin"), getAllOrdersAdmin);
router.put("/:id/status", authorize("admin"), updateOrderStatus);

module.exports = router;
