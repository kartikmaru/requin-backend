const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ── Helper: generate JWT ──────────────────────────────────────────────────────
// Payload is minimal — only user id. Full user is fetched from DB on each request.
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// ── Helper: set cookie + send JSON response ───────────────────────────────────
// Single source of truth for the cookie options — used by register AND login.
// Cookie name "token" must match what protect middleware reads (req.cookies.token).
const sendTokenResponse = (res, user, token, statusCode = 200) => {
  const isProduction = process.env.NODE_ENV === "production";

  // httpOnly    → JS cannot read this cookie — protects against XSS
  // secure      → only sent over HTTPS in production
  // sameSite    → "none" required for cross-origin cookie (Vercel → Render)
  //               "lax"  for local dev (same-origin)
  // maxAge      → 7 days in milliseconds
  res.cookie("token", token, {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });

  console.log(
    `[AUTH] Cookie set for user: ${user.email} | secure: ${isProduction} | sameSite: ${isProduction ? "none" : "lax"}`
  );

  // Also return token in JSON body so localStorage auth continues working
  return res.status(statusCode).json({
    _id:   user._id,
    name:  user.name,
    email: user.email,
    role:  user.role,
    token, // ← keeps existing localStorage flow intact
  });
};

// ── REGISTER ──────────────────────────────────────────────────────────────────
// @route  POST /api/auth/register
// @access Public
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("DEBUG: Attempting to save data:", JSON.stringify(
      { name, email, password: password ? "[provided]" : "[missing]" }, null, 2
    ));

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // User.create → pre-save hook hashes password automatically
    const user  = await User.create({ name, email, password });
    const token = generateToken(user._id);

    // Set cookie AND return token in JSON body
    return sendTokenResponse(res, user, token, 201);
  } catch (error) {
    console.error("DEBUG: Save Failed! Error:", error);
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({ message: error.message });
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
// @route  POST /api/auth/login
// @access Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("DEBUG: Login attempt for:", email || "[no email]");

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // +password forces inclusion — schema has select:false
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    // Set cookie AND return token in JSON body
    return sendTokenResponse(res, user, token, 200);
  } catch (error) {
    console.error("DEBUG: Save Failed! Error:", error);
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({ message: error.message });
  }
};

// ── GET PROFILE ───────────────────────────────────────────────────────────────
// @route  GET /api/auth/profile
// @access Private (protect middleware attaches req.user)
const getProfile = async (req, res) => {
  res.status(200).json({
    _id:       req.user._id,
    name:      req.user.name,
    email:     req.user.email,
    role:      req.user.role,
    createdAt: req.user.createdAt,
  });
};

// ── LOGOUT ────────────────────────────────────────────────────────────────────
// @route  POST /api/auth/logout
// @access Private
// Clears the httpOnly cookie by overwriting it with an expired one.
// Frontend also removes token from localStorage (handled in AuthContext).
const logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", "", {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? "none" : "lax",
    expires:  new Date(0), // immediately expired — browser deletes it
  });

  console.log("[AUTH] Cookie cleared on logout");

  res.status(200).json({ message: "Logged out successfully" });
};

module.exports = { register, login, getProfile, logout };
