const { body, param, query } = require("express-validator");

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required")
    .isLength({ max: 50 }).withMessage("Name cannot exceed 50 characters"),
  body("email").trim().isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("phone").optional({ values: "falsy" })
    .matches(/^\d{10}$/).withMessage("Phone must be 10 digits"),
];

const loginRules = [
  body("email").trim().isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const changePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
];

const addressRules = [
  body("street").trim().notEmpty().withMessage("Street address is required"),
  body("city").trim().notEmpty().withMessage("City is required"),
  body("state").trim().notEmpty().withMessage("State is required"),
  body("pincode").matches(/^\d{6}$/).withMessage("PIN code must be 6 digits"),
];

const productRules = [
  body("name").trim().notEmpty().withMessage("Product name is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("discountedPrice").optional({ values: "falsy" })
    .isFloat({ min: 0 }).withMessage("Discounted price must be a positive number"),
  body("category").isMongoId().withMessage("A valid category is required"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be 0 or more"),
];

// Everything is optional on update, but anything sent must still be valid.
const productUpdateRules = [
  param("id").isMongoId().withMessage("Invalid product id"),
  body("name").optional().trim().notEmpty().withMessage("Product name cannot be empty"),
  body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("discountedPrice").optional().isFloat({ min: 0 }).withMessage("Discounted price must be a positive number"),
  body("category").optional().isMongoId().withMessage("Invalid category"),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be 0 or more"),
];

const reviewRules = [
  param("id").isMongoId().withMessage("Invalid product id"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").trim().notEmpty().withMessage("Review comment is required"),
];

const cartAddRules = [
  body("productId").isMongoId().withMessage("Invalid product id"),
  body("quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

const cartUpdateRules = [
  body("productId").isMongoId().withMessage("Invalid product id"),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

const placeOrderRules = [
  body("shippingAddress.name").trim().notEmpty().withMessage("Recipient name is required"),
  body("shippingAddress.phone").matches(/^\d{10}$/).withMessage("Phone must be 10 digits"),
  body("shippingAddress.street").trim().notEmpty().withMessage("Street address is required"),
  body("shippingAddress.city").trim().notEmpty().withMessage("City is required"),
  body("shippingAddress.state").trim().notEmpty().withMessage("State is required"),
  body("shippingAddress.pincode").matches(/^\d{6}$/).withMessage("PIN code must be 6 digits"),
  body("paymentMethod").optional().isIn(["cod", "razorpay"]).withMessage("Unsupported payment method"),
];

const orderStatusRules = [
  param("id").isMongoId().withMessage("Invalid order id"),
  body("status").isIn(["pending", "confirmed", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid order status"),
];

const mongoIdParam = (name = "id") => [
  param(name).isMongoId().withMessage(`Invalid ${name}`),
];

const productQueryRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be 1 or more"),
  query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
  query("minPrice").optional().isFloat({ min: 0 }).withMessage("minPrice must be a positive number"),
  query("maxPrice").optional().isFloat({ min: 0 }).withMessage("maxPrice must be a positive number"),
];

module.exports = {
  registerRules, loginRules, changePasswordRules, addressRules,
  productRules, productUpdateRules, reviewRules,
  cartAddRules, cartUpdateRules,
  placeOrderRules, orderStatusRules,
  mongoIdParam, productQueryRules,
};
