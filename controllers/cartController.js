const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { createError } = require("../utils/apiError");
const { successResponse } = require("../utils/apiResponse");

const CART_PRODUCT_FIELDS = "name slug images price discountedPrice stock isActive";

const pickImage = (product) =>
  product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url || "";

const priceOf = (product) =>
  product.discountedPrice > 0 ? product.discountedPrice : product.price;

// Every cart endpoint answers with the same shape, so the frontend can just replace
// its cart state with whatever came back instead of re-fetching afterwards.
const sendCart = async (res, userId, message) => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product", CART_PRODUCT_FIELDS);

  const items = (cart?.items || [])
    // A product that was deleted since it was added would otherwise crash the page.
    .filter((item) => item.product)
    .map((item) => ({
      _id: item._id,
      product: item.product._id,
      slug: item.product.slug,
      name: item.product.name,
      image: pickImage(item.product),
      price: priceOf(item.product), // live price, not the snapshot taken at add time
      quantity: item.quantity,
      stock: item.product.stock,
      isAvailable: item.product.isActive && item.product.stock > 0,
    }));

  return successResponse(res, message, {
    cart: {
      items,
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      // Out-of-stock lines are shown but not charged for - checkout asks the user
      // to remove them before continuing.
      totalPrice: items
        .filter((i) => i.isAvailable)
        .reduce((sum, i) => sum + i.price * i.quantity, 0),
      hasUnavailableItems: items.some((i) => !i.isAvailable),
    },
  });
};

/**
 * GET /api/cart
 */
const getCart = async (req, res) => {
  const exists = await Cart.exists({ user: req.user._id });
  if (!exists) await Cart.create({ user: req.user._id, items: [] });

  return sendCart(res, req.user._id, "Cart retrieved successfully");
};

/**
 * POST /api/cart/add
 */
const addToCart = async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) return next(createError("Product not found.", 404));
  if (product.stock === 0) return next(createError("This product is out of stock.", 409));

  const cart =
    (await Cart.findOne({ user: req.user._id })) ||
    (await Cart.create({ user: req.user._id, items: [] }));

  const existing = cart.items.find((item) => item.product.toString() === productId);
  const newQuantity = (existing?.quantity || 0) + quantity;

  if (newQuantity > product.stock) {
    return next(
      createError(
        existing
          ? `You already have ${existing.quantity} in your cart and only ${product.stock} are available.`
          : `Only ${product.stock} available in stock.`,
        409
      )
    );
  }

  if (existing) {
    existing.quantity = newQuantity;
    existing.price = priceOf(product);
  } else {
    cart.items.push({
      product: productId,
      quantity,
      price: priceOf(product),
      name: product.name,
      image: pickImage(product),
    });
  }

  await cart.save();

  return sendCart(res, req.user._id, "Added to cart");
};

/**
 * PUT /api/cart/update
 */
const updateCartItem = async (req, res, next) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product) return next(createError("Product not found.", 404));
  if (quantity > product.stock) {
    return next(createError(`Only ${product.stock} available in stock.`, 409));
  }

  const cart = await Cart.findOne({ user: req.user._id });
  const item = cart?.items.find((i) => i.product.toString() === productId);
  if (!item) return next(createError("That item is not in your cart.", 404));

  item.quantity = quantity;
  item.price = priceOf(product);
  await cart.save();

  return sendCart(res, req.user._id, "Cart updated");
};

/**
 * DELETE /api/cart/remove/:productId
 */
const removeFromCart = async (req, res) => {
  await Cart.updateOne(
    { user: req.user._id },
    { $pull: { items: { product: req.params.productId } } }
  );

  return sendCart(res, req.user._id, "Item removed from cart");
};

/**
 * DELETE /api/cart/clear
 */
const clearCart = async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });

  return sendCart(res, req.user._id, "Cart cleared");
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
