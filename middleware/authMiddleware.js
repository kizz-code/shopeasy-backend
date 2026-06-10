/**
 * Auth Middleware
 * JWT verification and role-based access control
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { createError } = require("../utils/apiError");

/**
 * protect - Verifies JWT token and attaches user to request
 * Usage: router.get("/protected", protect, handler)
 */
const protect = async (req, res, next) => {
  let token;

  // Extract token from Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(createError("Authentication required. Please login.", 401));
  }

  try {
    // Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data (catches deleted/deactivated users)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(createError("User not found. Token invalid.", 401));
    }

    if (!user.isActive) {
      return next(createError("Your account has been deactivated. Contact support.", 403));
    }

    req.user = user; // Attach user to request object
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(createError("Session expired. Please login again.", 401));
    }
    if (error.name === "JsonWebTokenError") {
      return next(createError("Invalid token. Please login again.", 401));
    }
    return next(createError("Authentication failed.", 401));
  }
};

/**
 * authorize - Role-based access control
 * Usage: router.get("/admin", protect, authorize("admin"), handler)
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError("Authentication required.", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        createError(
          `Access denied. Required role: ${roles.join(" or ")}. Your role: ${req.user.role}`,
          403
        )
      );
    }

    next();
  };
};

/**
 * optionalAuth - Attaches user if token provided, but doesn't fail if not
 * Useful for public routes that show different data for logged-in users
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return next(); // Continue without user

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // Silently fail - user just won't be attached
  }

  next();
};

module.exports = { protect, authorize, optionalAuth };
