const express = require("express");
const router  = express.Router();

const { register, login, getProfile, logout } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/login",    login);

// Private routes — protect middleware runs first
router.get ("/profile",  protect, getProfile);
router.post("/logout",   protect, logout);    // clears httpOnly cookie

module.exports = router;
