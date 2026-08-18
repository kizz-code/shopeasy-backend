class ApiError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "ApiError";
  }
}

// Controllers use this rather than building errors by hand, so every error that
// reaches the error handler carries a status code.
const createError = (message, statusCode = 500, errors = null) =>
  new ApiError(message, statusCode, errors);

module.exports = { ApiError, createError };
