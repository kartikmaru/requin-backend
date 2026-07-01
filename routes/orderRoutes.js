const express = require("express");
const router  = express.Router();
const { createOrder, getMyOrders, getAllOrders, updateOrderStatus, getSalesByCategory } = require("../controllers/orderController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/admin",              protect, authorizeRoles("admin"), getAllOrders);
router.get("/sales-by-category",  protect, authorizeRoles("admin"), getSalesByCategory);
router.put("/:id/status",         protect, authorizeRoles("admin"), updateOrderStatus);
router.get("/my",                 protect, getMyOrders);
router.post("/",                  protect, createOrder);

module.exports = router;
