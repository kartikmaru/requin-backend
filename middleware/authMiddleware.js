const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;
  let tokenSource = "";

  // 1. Authorization header token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
    tokenSource = "Authorization header";
  }

  // 2. Cookie token fallback
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    tokenSource = "cookie";
  }

  if (!token) {
    console.log("[PROTECT] No token found");
    return res.status(401).json({
      message: "Not authorized, no token",
    });
  }

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[PROTECT] Token source: ${tokenSource}`);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error) {
    console.log("[PROTECT] Token verification failed:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired, please login again",
      });
    }

    return res.status(401).json({
      message: "Not authorized, token failed",
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

module.exports = { protect, authorizeRoles };