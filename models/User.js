/**
 * User Model
 * Handles user authentication, roles, and profile data
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    avatar: {
      type: String,
      default: "", // URL to avatar image
    },
    phone: {
      type: String,
      default: "",
    },
    addresses: [
      {
        label: { type: String, default: "Home" }, // Home, Work, etc.
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: "India" },
        isDefault: { type: Boolean, default: false },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ─── Pre-save Hook: Hash Password ─────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  // Only hash if password is modified (not on other updates)
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(12); // Cost factor of 12 for security
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Method: Compare Password ───────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance Method: Generate JWT ───────────────────────────────────────────
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};

// ─── Virtual: Full Profile (no password) ─────────────────────────────────────
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    phone: this.phone,
    addresses: this.addresses,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
