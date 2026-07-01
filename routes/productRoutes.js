const express = require("express");
const router  = express.Router();
const { createProduct, getProducts, getProductById, updateProduct, deleteProduct } = require("../controllers/productController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/",    getProducts);
router.get("/:id", getProductById);
router.post("/",   protect, authorizeRoles("admin"), createProduct);
router.put("/:id", protect, authorizeRoles("admin"), updateProduct);
router.delete("/:id", protect, authorizeRoles("admin"), deleteProduct);

module.exports = router;
