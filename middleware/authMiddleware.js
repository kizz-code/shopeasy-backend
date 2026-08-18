const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { createError } = require("../utils/apiError");

/**
 * Verifies the JWT and puts the user on req.user.
 *
 * The token itself carries the id and role, but we still load the user from the
 * database on every request. That costs one lookup and buys correctness: a user
 * who was deleted or deactivated after their token was issued is rejected straight
 * away, instead of staying valid until the token expires.
 *
 *   router.get("/orders", protect, handler)
 */
const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(createError("You need to be logged in to do that.", 401));
  }

  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return next(createError("That account no longer exists.", 401));
    if (!user.isActive) {
      return next(createError("Your account has been deactivated. Please contact support.", 403));
    }

    req.user = user;
    next();
  } catch (error) {
    // jwt.verify throws its own error types; the central error handler turns
    // TokenExpiredError and JsonWebTokenError into the right 401 messages.
    next(error);
  }
};

/**
 * Restricts a route to certain roles. Always used after protect(), which is what
 * sets req.user.
 *
 *   router.post("/products", protect, authorize("admin"), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(createError("You need to be logged in to do that.", 401));

  if (!roles.includes(req.user.role)) {
    return next(createError("You do not have permission to do that.", 403));
  }

  next();
};

module.exports = { protect, authorize };
