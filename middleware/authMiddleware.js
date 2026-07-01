const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * protect — JWT verification middleware
 *
 * TOKEN LOOKUP ORDER:
 *   1. Authorization: Bearer <token>  header  (primary — localStorage flow)
 *   2. req.cookies.token               (fallback — httpOnly cookie flow)
 *
 * Cookie name MUST match what authController sets: "token"
 * (Not "jwt" — that was a mismatch that caused the cookie fallback to never work)
 *
 * FLOW:
 *   Token found → jwt.verify() → decoded { id }
 *              → User.findById(id) → req.user = full user doc (no password)
 *              → req.userId = req.user._id (convenience alias)
 *              → next() → controller runs
 *
 * ERRORS:
 *   No token  → 401
 *   Bad token → 401
 *   No user   → 401
 */
const protect = async (req, res, next) => {
  // 1. Pehle Cookie check karo
  let token = req.cookies.token; // Tumhari cookie ka naam 'token' hai

  // 2. Agar Cookie nahi hai, toh Header check karo (Backup)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// ── 3. No token found ─────────────────────────────────────────────────────
if (!token) {
  console.log("[PROTECT] No token found — returning 401");
  return res.status(401).json({ message: "Not authorized, no token" });
}

console.log(`[PROTECT] Token source: ${tokenSource}`);

try {
  // Verify signature + expiry
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Fetch fresh from DB — ensures role/status changes take effect immediately
  req.user = await User.findById(decoded.id).select("-password");
  req.userId = req.user?._id;

  if (!req.user) {
    return res.status(401).json({ message: "User not found" });
  }

  next();
} catch (error) {
  console.log("[PROTECT] Token verification failed:", error.message);
  return res.status(401).json({ message: "Not authorized, token failed" });
}
};

/**
 * authorizeRoles(...roles) — role-based access control
 * Must be used AFTER protect (requires req.user).
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
