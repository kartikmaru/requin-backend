const express = require("express");
const router  = express.Router();
const { getStats } = require("../controllers/adminController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/stats", protect, authorizeRoles("admin"), getStats);

module.exports = router;
