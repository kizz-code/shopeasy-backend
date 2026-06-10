const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { getDashboard, getAllUsers, toggleUserStatus } = require("../controllers/adminController");

router.use(protect, authorize("admin")); // All admin routes require admin role

router.get("/dashboard", getDashboard);
router.get("/users", getAllUsers);
router.put("/users/:id/toggle-status", toggleUserStatus);

module.exports = router;
