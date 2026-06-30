const Order   = require("../models/Order");
const Product = require("../models/Product");

// @route  POST /api/orders
// @access Private — User
// Body: { items: [{ product, quantity }], shippingAddress }
const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    // Validate input — log what was received so Render logs show the issue
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("ORDER_CREATE_ERROR: No items in request body.", { body: req.body });
      return res.status(400).json({ message: "No order items provided" });
    }

    let totalAmount    = 0;
    const resolvedItems = [];

    // Phase 1 — validate ALL items and collect stock updates before saving anything
    // This prevents partial stock reduction if one item fails mid-loop
    const stockUpdates = []; // hold products to update after full validation

    for (const item of items) {
      if (!item.product || !item.quantity) {
        return res.status(400).json({
          message: "Each item must have product ID and quantity",
          received: item,
        });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for: ${product.name}`,
          available: product.stock,
          requested: item.quantity,
        });
      }

      resolvedItems.push({
        product:  product._id,
        name:     product.name,
        price:    product.price,
        quantity: Number(item.quantity),
      });

      totalAmount += product.price * Number(item.quantity);
      stockUpdates.push({ product, quantity: Number(item.quantity) });
    }

    // Phase 2 — reduce stock (all validations passed)
    for (const { product, quantity } of stockUpdates) {
      product.stock -= quantity;
      await product.save(); // awaited correctly — no fire-and-forget
    }

    // Phase 3 — create the order document
    const order = await Order.create({
      user:            req.user._id,
      items:           resolvedItems,
      totalAmount,
      shippingAddress: shippingAddress || "",
    });

    res.status(201).json(order);
  } catch (error) {
    // Full error — Mongoose validation errors have detail in error.errors
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({
      message: error.message,
      errors: error.errors
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
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product", "name price image")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/orders/admin
// @access Private — Admin only (all orders with user info)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "name price")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({ message: error.message });
  }
};

// @route  PUT /api/orders/:id/status
// @access Private — Admin only
const updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;

    const update = {};
    if (status)        update.status        = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No status fields provided" });
    }

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
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/orders/sales-by-category
// @access Private — Admin (aggregation pipeline)
const getSalesByCategory = async (req, res) => {
  try {
    const salesData = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          totalSales:  { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          orderCount:  { $sum: 1 },
        },
      },
      { $sort: { totalSales: -1 } },
      {
        $project: {
          _id: 0,
          product:    "$_id",
          totalSales: { $round: ["$totalSales", 2] },
          orderCount: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, count: salesData.length, data: salesData });
  } catch (error) {
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
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
