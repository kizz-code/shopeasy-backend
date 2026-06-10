/**
 * Product Model
 * Full product schema with ratings, stock, and category references
 */

const mongoose = require("mongoose");
const slugify = require("slugify");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountedPrice: {
      type: Number,
      default: 0, // 0 means no discount
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },
    brand: {
      type: String,
      trim: true,
      default: "",
    },
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, default: "" },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    reviews: [reviewSchema],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    weight: { type: Number, default: 0 }, // in grams
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes for Performance ──────────────────────────────────────────────────
productSchema.index({ name: "text", description: "text", tags: "text" }); // Full-text search
productSchema.index({ category: 1, price: 1 }); // Compound index for filtering
productSchema.index({ isFeatured: 1, isActive: 1 });
// productSchema.index({ slug: 1 });

// ─── Virtual: Discount Percentage ────────────────────────────────────────────
productSchema.virtual("discountPercentage").get(function () {
  if (this.discountedPrice && this.discountedPrice < this.price) {
    return Math.round(((this.price - this.discountedPrice) / this.price) * 100);
  }
  return 0;
});

// ─── Virtual: Effective Price ─────────────────────────────────────────────────
productSchema.virtual("effectivePrice").get(function () {
  return this.discountedPrice > 0 ? this.discountedPrice : this.price;
});

// ─── Pre-save: Auto-generate Slug ────────────────────────────────────────────
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// ─── Method: Recalculate Rating ───────────────────────────────────────────────
productSchema.methods.recalculateRating = function () {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.numReviews = 0;
  } else {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating = Math.round((totalRating / this.reviews.length) * 10) / 10;
    this.numReviews = this.reviews.length;
  }
};

module.exports = mongoose.model("Product", productSchema);
