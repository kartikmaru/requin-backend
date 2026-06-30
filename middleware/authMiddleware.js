const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect — JWT verification middleware
 *
 * DATA FLOW:
 *   Client sends  →  Authorization: Bearer <token>  header  (primary)
 *                    OR  req.cookies.jwt  (fallback, if cookie auth is used)
 *   Middleware    →  jwt.verify(token, JWT_SECRET) → decoded { id }
 *                →  User.findById(decoded.id)      → req.user = user doc
 *                →  next()                          → controller runs
 *
 * ERRORS:
 *   No token   → 401 "Not authorized, no token"
 *   Bad token  → 401 "Not authorized, token failed"
 *   No user    → 401 "User not found"
 *
 * JWT payload is intentionally minimal: { id: user._id }
 * The full user document is fetched fresh from DB on every protected request
 * so role/status changes take effect immediately.
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Check Authorization: Bearer <token> header (primary method)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // 2. Fallback: cookie-based token (if cookie auth is also in use)
  else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  // 3. No token found at all
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    // Verify signature + expiry — throws on failure
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user fresh from DB, exclude password
    // req.user is now available in all downstream controllers
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Also expose req.userId as a convenience alias
    req.userId = req.user._id;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

/**
 * authorizeRoles(...roles) — role-based access control
 * Must be used AFTER protect (requires req.user to be set).
 *
 * Usage: router.post("/", protect, authorizeRoles("admin"), createProduct)
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };
