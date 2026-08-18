const isProduction = () => process.env.NODE_ENV === "production";

// Anything that did not match a route lands here and is turned into a normal error.
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * The single place errors turn into responses. Controllers just call
 * next(createError(...)) or throw, and this decides the status code and the body.
 * Mongoose throws its own error shapes, so those are translated here too.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  let errors = err.errors || null;

  // Badly formed ObjectId in a URL
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Unique index violation, e.g. registering an email that already exists
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    statusCode = 409;
    message = `That ${field} is already taken.`;
  }

  // Schema validation failed on save()
  if (err.name === "ValidationError") {
    statusCode = 422;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your session has expired. Please log in again.";
  }

  if (!isProduction()) {
    console.error(`[${statusCode}] ${req.method} ${req.originalUrl} - ${err.message}`);
    if (statusCode === 500) console.error(err.stack);
  }

  // An unexpected 500 can carry internal details in its message, so in production
  // it is replaced with something generic. Errors we raised ourselves are fine.
  if (isProduction() && statusCode === 500) {
    message = "Something went wrong. Please try again.";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(!isProduction() && statusCode === 500 && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
