const User = require("../models/User");
const Cart = require("../models/Cart");
const { createError } = require("../utils/apiError");
const { successResponse } = require("../utils/apiResponse");

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(createError("An account with this email already exists.", 409));
  }

  // The password is hashed by the pre-save hook on the User model, never here.
  const user = await User.create({ name, email, password, phone });
  await Cart.create({ user: user._id, items: [] });

  return successResponse(
    res,
    "Account created. Welcome to ShopEasy!",
    { user: user.toPublicJSON(), token: user.generateAuthToken() },
    201
  );
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  const { email, password } = req.body;

  // password has select:false on the schema, so it has to be asked for explicitly.
  const user = await User.findOne({ email }).select("+password");

  // Same message whether the email or the password was wrong - otherwise the
  // response tells an attacker which emails are registered.
  if (!user || !(await user.comparePassword(password))) {
    return next(createError("Invalid email or password.", 401));
  }

  if (!user.isActive) {
    return next(createError("Your account has been deactivated. Please contact support.", 403));
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  return successResponse(res, `Welcome back, ${user.name}!`, {
    user: user.toPublicJSON(),
    token: user.generateAuthToken(),
  });
};

/**
 * GET /api/auth/me
 * The token carries the user id; protect() has already loaded the user for us.
 */
const getMe = async (req, res) =>
  successResponse(res, "Profile retrieved successfully", { user: req.user.toPublicJSON() });

/**
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res, next) => {
  const { name, phone, avatar } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return next(createError("User not found.", 404));

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();

  return successResponse(res, "Profile updated successfully", { user: user.toPublicJSON() });
};

/**
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    return next(createError("Your current password is incorrect.", 400));
  }

  user.password = newPassword;
  await user.save();

  // A fresh token, so any session started with the old password is not reused.
  return successResponse(res, "Password changed successfully", {
    token: user.generateAuthToken(),
  });
};

// Only one address can be the default one at a time.
const applyDefault = (user, addressId) => {
  user.addresses.forEach((a) => {
    a.isDefault = a._id.toString() === addressId.toString();
  });
};

/**
 * POST /api/auth/address
 */
const addAddress = async (req, res) => {
  const { label, street, city, state, pincode, country, isDefault } = req.body;
  const user = await User.findById(req.user._id);

  user.addresses.push({ label, street, city, state, pincode, country });

  // The first address a user saves becomes their default automatically.
  const added = user.addresses[user.addresses.length - 1];
  if (isDefault || user.addresses.length === 1) applyDefault(user, added._id);

  await user.save();

  return successResponse(res, "Address added successfully", { addresses: user.addresses }, 201);
};

/**
 * PUT /api/auth/address/:addressId
 */
const updateAddress = async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) return next(createError("Address not found.", 404));

  const { label, street, city, state, pincode, country, isDefault } = req.body;
  Object.assign(address, { label, street, city, state, pincode, country });

  if (isDefault) applyDefault(user, address._id);

  await user.save();

  return successResponse(res, "Address updated successfully", { addresses: user.addresses });
};

/**
 * DELETE /api/auth/address/:addressId
 */
const deleteAddress = async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) return next(createError("Address not found.", 404));

  const wasDefault = address.isDefault;
  address.deleteOne();

  // If we just removed the default, promote whichever address is left first.
  if (wasDefault && user.addresses.length > 0) {
    applyDefault(user, user.addresses[0]._id);
  }

  await user.save();

  return successResponse(res, "Address removed successfully", { addresses: user.addresses });
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
};
