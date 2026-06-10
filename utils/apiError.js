/**
 * Custom API Error Utility
 * Creates structured error objects for consistent error handling
 */

class ApiError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "ApiError";
  }
}

/**
 * createError - Factory function for ApiError
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Array} errors - Optional array of field errors
 */
const createError = (message, statusCode = 500, errors = null) => {
  return new ApiError(message, statusCode, errors);
};

module.exports = { ApiError, createError };
