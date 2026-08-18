const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { mongoIdParam } = require("../middleware/validators");
const { getDashboard, getAllUsers, toggleUserStatus } = require("../controllers/adminController");

router.use(protect, authorize("admin"));

router.get("/dashboard", getDashboard);
router.get("/users", getAllUsers);
router.put("/users/:id/toggle-status", mongoIdParam(), validate, toggleUserStatus);

module.exports = router;
