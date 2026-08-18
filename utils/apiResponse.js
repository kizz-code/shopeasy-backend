// Every endpoint answers with the same shape, so the frontend never has to guess
// how to read a response.

const successResponse = (res, message, data = null, statusCode = 200) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
};

const paginatedResponse = (res, message, data, { page, totalPages, totalItems, limit }) =>
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });

module.exports = { successResponse, paginatedResponse };
