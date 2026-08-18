const Product = require("../models/Product");
const { createError } = require("../utils/apiError");
const { successResponse, paginatedResponse } = require("../utils/apiResponse");

// Only these sorts are accepted, so a query string cannot ask Mongo to sort by
// anything we did not intend.
const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  rating: { rating: -1 },
  name: { name: 1 },
};

// Escapes user input before it goes into a regex, so a stray "(" or "*" is treated
// as a plain character instead of blowing up the query.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildProductQuery = ({ search, category, minPrice, maxPrice, brand, featured }) => {
  const query = { isActive: true };

  if (search?.trim()) {
    const term = new RegExp(escapeRegex(search.trim()), "i");
    query.$or = [{ name: term }, { brand: term }, { tags: term }];
  }

  if (category) query.category = category;
  if (brand) query.brand = new RegExp(`^${escapeRegex(brand)}$`, "i");
  if (featured === "true") query.isFeatured = true;

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  return query;
};

/**
 * GET /api/products
 * Search, filter, sort and pagination all happen in MongoDB. The browser only ever
 * receives the page it asked for, which keeps the response small no matter how big
 * the catalogue grows.
 */
const getProducts = async (req, res) => {
  const { sort = "newest" } = req.query;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const query = buildProductQuery(req.query);

  const [products, totalItems] = await Promise.all([
    Product.find(query)
      .select("-reviews")
      .populate("category", "name slug")
      .sort(SORT_OPTIONS[sort] || SORT_OPTIONS.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  return paginatedResponse(res, "Products retrieved successfully", products, {
    page,
    totalPages: Math.ceil(totalItems / limit),
    totalItems,
    limit,
  });
};

/**
 * GET /api/products/:identifier
 * Accepts either a Mongo id or a slug, so /products/apple-iphone-15-pro works
 * as well as /products/6a29...
 */
const getProduct = async (req, res, next) => {
  const { identifier } = req.params;
  const isObjectId = /^[a-fA-F0-9]{24}$/.test(identifier);

  const product = await Product.findOne({
    ...(isObjectId ? { _id: identifier } : { slug: identifier }),
    isActive: true,
  }).populate("category", "name slug");

  if (!product) return next(createError("Product not found.", 404));

  return successResponse(res, "Product retrieved successfully", { product });
};

/**
 * GET /api/products/featured
 */
const getFeaturedProducts = async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true })
    .select("-reviews")
    .populate("category", "name slug")
    .limit(8)
    .lean();

  return successResponse(res, "Featured products retrieved", { products });
};

const EDITABLE_FIELDS = [
  "name", "description", "shortDescription", "price", "discountedPrice",
  "category", "brand", "images", "stock", "tags", "isFeatured", "isActive",
];

/**
 * POST /api/products  (admin)
 */
const createProduct = async (req, res, next) => {
  const payload = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
  });

  if (payload.discountedPrice > 0 && payload.discountedPrice >= payload.price) {
    return next(createError("Discounted price must be lower than the actual price.", 400));
  }

  const product = await Product.create(payload);
  await product.populate("category", "name slug");

  return successResponse(res, "Product created successfully", { product }, 201);
};

/**
 * PUT /api/products/:id  (admin)
 */
const updateProduct = async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(createError("Product not found.", 404));

  EDITABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  if (product.discountedPrice > 0 && product.discountedPrice >= product.price) {
    return next(createError("Discounted price must be lower than the actual price.", 400));
  }

  await product.save();
  await product.populate("category", "name slug");

  return successResponse(res, "Product updated successfully", { product });
};

/**
 * DELETE /api/products/:id  (admin)
 * Soft delete - past orders still need to be able to show what was bought.
 */
const deleteProduct = async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(createError("Product not found.", 404));

  product.isActive = false;
  await product.save();

  return successResponse(res, "Product deleted successfully");
};

/**
 * POST /api/products/:id/reviews
 */
const addReview = async (req, res, next) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) return next(createError("Product not found.", 404));

  const alreadyReviewed = product.reviews.some(
    (r) => r.user.toString() === req.user._id.toString()
  );
  if (alreadyReviewed) {
    return next(createError("You have already reviewed this product.", 409));
  }

  product.reviews.push({
    user: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    comment,
  });
  product.recalculateRating();
  await product.save();

  return successResponse(
    res,
    "Review added successfully",
    { rating: product.rating, numReviews: product.numReviews },
    201
  );
};

module.exports = {
  getProducts,
  getProduct,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
};
