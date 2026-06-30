const express = require("express");
const router = express.Router();

const { register, login, getProfile } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Private route — protect runs first, then getProfile
router.get("/profile", protect, getProfile);

module.exports = router;
