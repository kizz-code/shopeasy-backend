/**
 * API Response Utility
 * Standardizes all API responses with consistent structure
 */

/**
 * successResponse - Standard success response
 */
const successResponse = (res, message, data = null, statusCode = 200) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

/**
 * paginatedResponse - Response with pagination metadata
 */
const paginatedResponse = (res, message, data, pagination) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      totalItems: pagination.totalItems,
      itemsPerPage: pagination.limit,
      hasNextPage: pagination.page < pagination.totalPages,
      hasPrevPage: pagination.page > 1,
    },
  });
};

module.exports = { successResponse, paginatedResponse };
