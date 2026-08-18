const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  registerRules, loginRules, changePasswordRules, addressRules,
} = require("../middleware/validators");
const {
  register, login, getMe, updateProfile, changePassword,
  addAddress, updateAddress, deleteAddress,
} = require("../controllers/authController");

router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);

router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePasswordRules, validate, changePassword);

router.post("/address", protect, addressRules, validate, addAddress);
router.put("/address/:addressId", protect, addressRules, validate, updateAddress);
router.delete("/address/:addressId", protect, deleteAddress);

module.exports = router;
