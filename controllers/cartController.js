/**
 * Cart Controller
 * Add, remove, update, and sync cart operations
 */

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { createError } = require("../utils/apiError");
const { successResponse } = require("../utils/apiResponse");

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product",
    "name images price discountedPrice stock isActive"
  );

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  return successResponse(res, "Cart retrieved successfully", {
    cart: {
      _id: cart._id,
      items: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
    },
  });
};

/**
 * @desc    Add item to cart
 * @route   POST /api/cart/add
 * @access  Private
 */
const addToCart = async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  // Validate product
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) return next(createError("Product not found.", 404));

  if (product.stock < quantity) {
    return next(createError(`Only ${product.stock} items available in stock.`, 400));
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  // Check if product already in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  const effectivePrice = product.discountedPrice > 0 ? product.discountedPrice : product.price;
  const primaryImage = product.images.find((img) => img.isPrimary)?.url || product.images[0]?.url || "";

  if (existingItemIndex > -1) {
    // Update quantity
    const newQty = cart.items[existingItemIndex].quantity + quantity;

    if (newQty > product.stock) {
      return next(createError(`Cannot add more. Only ${product.stock} items available.`, 400));
    }

    cart.items[existingItemIndex].quantity = newQty;
    cart.items[existingItemIndex].price = effectivePrice; // Refresh price
  } else {
    // Add new item
    cart.items.push({
      product: productId,
      quantity,
      price: effectivePrice,
      name: product.name,
      image: primaryImage,
    });
  }

  await cart.save();

  return successResponse(res, "Item added to cart", {
    totalItems: cart.totalItems,
    totalPrice: cart.totalPrice,
  });
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/update
 * @access  Private
 */
const updateCartItem = async (req, res, next) => {
  const { productId, quantity } = req.body;

  if (quantity < 1) {
    return next(createError("Quantity must be at least 1. Use remove to delete item.", 400));
  }

  const product = await Product.findById(productId);
  if (!product) return next(createError("Product not found.", 404));

  if (quantity > product.stock) {
    return next(createError(`Only ${product.stock} items available in stock.`, 400));
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return next(createError("Cart not found.", 404));

  const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
  if (itemIndex === -1) return next(createError("Item not found in cart.", 404));

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  return successResponse(res, "Cart updated", {
    totalItems: cart.totalItems,
    totalPrice: cart.totalPrice,
  });
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/remove/:productId
 * @access  Private
 */
const removeFromCart = async (req, res, next) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return next(createError("Cart not found.", 404));

  cart.items = cart.items.filter((item) => item.product.toString() !== productId);
  await cart.save();

  return successResponse(res, "Item removed from cart", {
    totalItems: cart.totalItems,
    totalPrice: cart.totalPrice,
  });
};

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/cart/clear
 * @access  Private
 */
const clearCart = async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return next(createError("Cart not found.", 404));

  cart.items = [];
  await cart.save();

  return successResponse(res, "Cart cleared successfully");
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
