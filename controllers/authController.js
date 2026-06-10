/**
 * Auth Controller
 * Handles user registration, login, profile management
 */

const User = require("../models/User");
const Cart = require("../models/Cart");
const { createError } = require("../utils/apiError");
const { successResponse } = require("../utils/apiResponse");

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(createError("An account with this email already exists.", 409));
  }

  // Create user (password is hashed via pre-save hook)
  const user = await User.create({ name, email, password, phone });

  // Create empty cart for new user
  await Cart.create({ user: user._id, items: [] });

  // Generate JWT
  const token = user.generateAuthToken();

  return successResponse(
    res,
    "Account created successfully! Welcome to ShopEasy.",
    { user: user.toPublicJSON(), token },
    201
  );
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  const { email, password } = req.body;

  // Explicitly select password (it's select:false by default)
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(createError("Invalid email or password.", 401));
  }

  if (!user.isActive) {
    return next(createError("Your account has been deactivated. Please contact support.", 403));
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(createError("Invalid email or password.", 401));
  }

  // Update last login timestamp
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = user.generateAuthToken();

  return successResponse(res, `Welcome back, ${user.name}!`, {
    user: user.toPublicJSON(),
    token,
  });
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  return successResponse(res, "Profile retrieved successfully", {
    user: req.user.toPublicJSON(),
  });
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  const { name, phone, avatar } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) return next(createError("User not found.", 404));

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();

  return successResponse(res, "Profile updated successfully", {
    user: user.toPublicJSON(),
  });
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) {
    return next(createError("Current password is incorrect.", 400));
  }

  user.password = newPassword;
  await user.save();

  const token = user.generateAuthToken();

  return successResponse(res, "Password changed successfully", { token });
};

/**
 * @desc    Add or update shipping address
 * @route   POST /api/auth/address
 * @access  Private
 */
const addAddress = async (req, res, next) => {
  const { label, street, city, state, pincode, country, isDefault } = req.body;

  const user = await User.findById(req.user._id);

  // If this is default, unset all others
  if (isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  user.addresses.push({ label, street, city, state, pincode, country, isDefault });
  await user.save();

  return successResponse(res, "Address added successfully", {
    addresses: user.addresses,
  });
};

module.exports = { register, login, getMe, updateProfile, changePassword, addAddress };
