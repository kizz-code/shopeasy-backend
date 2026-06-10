/**
 * Product Controller
 * CRUD, search, filter, pagination, and reviews
 */

const Product = require("../models/Product");
const { createError } = require("../utils/apiError");
const { successResponse, paginatedResponse } = require("../utils/apiResponse");

/**
 * @desc    Get all products with search, filter, sort, pagination
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res) => {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    brand,
    featured,
    sort = "-createdAt",
    page = 1,
    limit = 12,
  } = req.query;

  // ─── Build Query Object ────────────────────────────────────────────────────
  const query = { isActive: true };

  // Full-text search
  if (search) {
    query.$text = { $search: search };
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Brand filter
  if (brand) {
    query.brand = { $regex: brand, $options: "i" };
  }

  // Featured filter
  if (featured === "true") {
    query.isFeatured = true;
  }

  // ─── Pagination ────────────────────────────────────────────────────────────
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // ─── Execute Query ─────────────────────────────────────────────────────────
  const [products, totalItems] = await Promise.all([
    Product.find(query)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalItems / limitNum);

  return paginatedResponse(res, "Products retrieved successfully", products, {
    page: pageNum,
    totalPages,
    totalItems,
    limit: limitNum,
  });
};

/**
 * @desc    Get single product by ID or slug
 * @route   GET /api/products/:identifier
 * @access  Public
 */
const getProduct = async (req, res, next) => {
  const { identifier } = req.params;

  // Try by ID first, then by slug
  const isObjectId = /^[a-fA-F0-9]{24}$/.test(identifier);
  const query = isObjectId ? { _id: identifier } : { slug: identifier };

  const product = await Product.findOne({ ...query, isActive: true }).populate(
    "category",
    "name slug"
  );

  if (!product) {
    return next(createError("Product not found.", 404));
  }

  return successResponse(res, "Product retrieved successfully", { product });
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = async (req, res, next) => {
  const {
    name, description, shortDescription, price, discountedPrice,
    category, brand, images, stock, sku, tags, isFeatured, weight, dimensions,
  } = req.body;

  // Check for duplicate SKU
  if (sku) {
    const existing = await Product.findOne({ sku });
    if (existing) return next(createError("A product with this SKU already exists.", 409));
  }

  const product = await Product.create({
    name, description, shortDescription, price, discountedPrice,
    category, brand, images, stock, sku, tags, isFeatured, weight, dimensions,
  });

  await product.populate("category", "name slug");

  return successResponse(res, "Product created successfully", { product }, 201);
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(createError("Product not found.", 404));

  // Update only provided fields
  const allowedFields = [
    "name", "description", "shortDescription", "price", "discountedPrice",
    "category", "brand", "images", "stock", "sku", "tags", "isFeatured",
    "isActive", "weight", "dimensions",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

  await product.save();
  await product.populate("category", "name slug");

  return successResponse(res, "Product updated successfully", { product });
};

/**
 * @desc    Delete product (soft delete)
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(createError("Product not found.", 404));

  product.isActive = false; // Soft delete preserves order history
  await product.save();

  return successResponse(res, "Product deleted successfully");
};

/**
 * @desc    Get featured products
 * @route   GET /api/products/featured
 * @access  Public
 */
const getFeaturedProducts = async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true })
    .populate("category", "name slug")
    .limit(8)
    .lean();

  return successResponse(res, "Featured products retrieved", { products });
};

/**
 * @desc    Add product review
 * @route   POST /api/products/:id/reviews
 * @access  Private
 */
const addReview = async (req, res, next) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) return next(createError("Product not found.", 404));

  // Check if user already reviewed
  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (alreadyReviewed) {
    return next(createError("You have already reviewed this product.", 400));
  }

  product.reviews.push({
    user: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    comment,
  });

  product.recalculateRating();
  await product.save();

  return successResponse(res, "Review added successfully", { rating: product.rating }, 201);
};

module.exports = {
  getProducts, getProduct, createProduct, updateProduct,
  deleteProduct, getFeaturedProducts, addReview,
};
