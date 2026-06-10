/**
 * Centralized Error Handling Middleware
 * Catches all errors and returns consistent JSON responses
 */

/**
 * notFound - 404 handler for unmatched routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * errorHandler - Global error handler
 * Handles: Mongoose errors, JWT errors, custom errors, and generic errors
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || null;

  // ─── Mongoose: Document Not Found ─────────────────────────────────────────
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}. Please provide a valid ID.`;
  }

  // ─── Mongoose: Duplicate Key Error ────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists.`;
  }

  // ─── Mongoose: Validation Error ───────────────────────────────────────────
  if (err.name === "ValidationError") {
    statusCode = 422;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // ─── JWT Errors ───────────────────────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token has expired";
  }

  // ─── Log error in development ─────────────────────────────────────────────
  if (process.env.NODE_ENV === "development") {
    console.error("\n❌ Error:", {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  }

  // ─── Send Response ────────────────────────────────────────────────────────
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
