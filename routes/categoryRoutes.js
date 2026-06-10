const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const { protect, authorize } = require("../middleware/authMiddleware");
const { successResponse } = require("../utils/apiResponse");
const { createError } = require("../utils/apiError");

// GET all categories
router.get("/", async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort("name").lean();
  return successResponse(res, "Categories retrieved", { categories });
});

// POST create category (admin)
router.post("/", protect, authorize("admin"), async (req, res, next) => {
  const { name, description, image } = req.body;
  const category = await Category.create({ name, description, image });
  return successResponse(res, "Category created", { category }, 201);
});

// PUT update category (admin)
router.put("/:id", protect, authorize("admin"), async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) return next(createError("Category not found.", 404));
  return successResponse(res, "Category updated", { category });
});

// DELETE category (admin)
router.delete("/:id", protect, authorize("admin"), async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) return next(createError("Category not found.", 404));
  return successResponse(res, "Category deleted");
});

module.exports = router;
