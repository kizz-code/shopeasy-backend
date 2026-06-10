const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  register, login, getMe, updateProfile, changePassword, addAddress,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.post("/address", protect, addAddress);

module.exports = router;
