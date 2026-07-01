const jwt  = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const sendTokenResponse = (res, user, token, statusCode = 200) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
  return res.status(statusCode).json({
    _id:   user._id,
    name:  user.name,
    email: user.email,
    role:  user.role,
    token,
  });
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all fields" });
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
    const user  = await User.create({ name, email, password });
    const token = generateToken(user._id);
    return sendTokenResponse(res, user, token, 201);
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = generateToken(user._id);
    return sendTokenResponse(res, user, token, 200);
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  res.status(200).json({
    _id:       req.user._id,
    name:      req.user.name,
    email:     req.user.email,
    role:      req.user.role,
    createdAt: req.user.createdAt,
  });
};

const logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", "", {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? "none" : "lax",
    expires:  new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
};

module.exports = { register, login, getProfile, logout };
