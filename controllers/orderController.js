const Order   = require("../models/Order");
const Product = require("../models/Product");

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA REQUIRED FIELDS AUDIT (Order.js):
//   user          → required ✅  set from req.user._id — NOT from frontend body
//   items         → required ✅  frontend sends: [{ product, quantity }]
//   items.product → required ✅  each item must have a valid product ObjectId
//   items.name    → required ✅  resolved from DB — NOT from frontend body
//   items.price   → required ✅  resolved from DB — NOT from frontend body
//   items.quantity→ required ✅  frontend sends: quantity (coerced to Number)
//   totalAmount   → required ✅  calculated in controller — NOT from frontend body
//   shippingAddress → NOT required (default: "")
//   status        → NOT required (default: "pending")
//   paymentStatus → NOT required (default: "unpaid")
// ─────────────────────────────────────────────────────────────────────────────

// @route  POST /api/orders
// @access Private — User
// Body: { items: [{ product, quantity }], shippingAddress }
const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    // DEBUG LOG — shows exactly what the frontend sent
    console.log("DEBUG: Attempting to save data:", JSON.stringify(req.body, null, 2));

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("ORDER_CREATE_ERROR: items missing or empty.", { body: req.body });
      return res.status(400).json({ message: "No order items provided" });
    }

    let totalAmount     = 0;
    const resolvedItems = [];
    const stockUpdates  = []; // collected for Phase 2

    // ── Phase 1: Validate ALL items before modifying anything ────────────────
    for (const item of items) {
      if (!item.product || !item.quantity) {
        return res.status(400).json({
          message:  "Each item must have product ID and quantity",
          received: item,
        });
      }

      // await is present — findById reads from MongoDB
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message:   `Insufficient stock for: ${product.name}`,
          available: product.stock,
          requested: item.quantity,
        });
      }

      resolvedItems.push({
        product:  product._id,
        name:     product.name,   // resolved from DB — schema requires this
        price:    product.price,  // resolved from DB — schema requires this
        quantity: Number(item.quantity),
      });

      totalAmount += product.price * Number(item.quantity);
      stockUpdates.push({ product, quantity: Number(item.quantity) });
    }

    // ── Phase 2: Reduce stock (all items validated) ──────────────────────────
    for (const { product, quantity } of stockUpdates) {
      product.stock -= quantity;
      await product.save(); // await is present — saves each product to MongoDB
    }

    // ── Phase 3: Create the order document ──────────────────────────────────
    console.log("DEBUG: Creating order with resolvedItems:", JSON.stringify(resolvedItems, null, 2));

    // await is present — Order.create() saves to MongoDB
    const order = await Order.create({
      user:            req.user._id,   // from protect middleware — NOT req.body
      items:           resolvedItems,  // resolved from DB — NOT from req.body directly
      totalAmount,                     // calculated — NOT from req.body
      shippingAddress: shippingAddress || "",
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("DEBUG: Save Failed! Error:", error);
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({
      message: error.message,
      errors:  error.errors
        ? Object.fromEntries(
            Object.entries(error.errors).map(([k, v]) => [k, v.message])
          )
        : undefined,
    });
  }
};

// @route  GET /api/orders/my
// @access Private — User (own orders only)
const getMyOrders = async (req, res) => {
  try {
    // await is present — find() reads from MongoDB
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product", "name price image")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error("DEBUG: Save Failed! Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/orders/admin
// @access Private — Admin only
const getAllOrders = async (req, res) => {
  try {
    // await is present — find() reads from MongoDB
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "name price")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error("DEBUG: Save Failed! Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @route  PUT /api/orders/:id/status
// @access Private — Admin only
const updateOrderStatus = async (req, res) => {
  try {
    console.log("DEBUG: Attempting to save data:", JSON.stringify(req.body, null, 2));

    const { status, paymentStatus } = req.body;

    const update = {};
    if (status)        update.status        = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No status fields provided" });
    }

    // await is present — findByIdAndUpdate saves to MongoDB
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).populate("user", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("DEBUG: Save Failed! Error:", error);
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/orders/sales-by-category
// @access Private — Admin (aggregation pipeline)
const getSalesByCategory = async (req, res) => {
  try {
    // await is present — aggregate() reads from MongoDB
    const salesData = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id:        "$items.name",
          totalSales: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSales: -1 } },
      {
        $project: {
          _id:        0,
          product:    "$_id",
          totalSales: { $round: ["$totalSales", 2] },
          orderCount: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, count: salesData.length, data: salesData });
  } catch (error) {
    console.error("DEBUG: Save Failed! Error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getSalesByCategory,
};
