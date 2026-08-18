const { validationResult } = require("express-validator");
const { createError } = require("../utils/apiError");

// Runs after a list of express-validator rules and turns any failures into the
// same { success, message, errors } shape the rest of the API uses.
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(createError("Validation failed", 422, errors));
};

module.exports = validate;
