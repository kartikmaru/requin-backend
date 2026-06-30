const Order = require("../models/Order");
const Product = require("../models/Product");

// @route  POST /api/orders
// @access Private — User
// Body: { items: [{ product, quantity }], shippingAddress }
const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No order items provided" });
    }

    // Validate each item and calculate total
    let totalAmount = 0;
    const resolvedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for: ${product.name}` });
      }

      resolvedItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });

      totalAmount += product.price * item.quantity;

      // Reduce stock
      product.stock -= item.quantity;
      await product.save();
    }

    const order = await Order.create({
      user: req.user._id,
      items: resolvedItems,
      totalAmount,
      shippingAddress: shippingAddress || "",
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
};

// @route  PUT /api/orders/:id/status
// @access Private — Admin only
const updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
      },
      { new: true }
    ).populate("user", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
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
          totalSales: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSales: -1 } },
      {
        $project: {
          _id: 0,
          product: "$_id",
          totalSales: { $round: ["$totalSales", 2] },
          orderCount: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, count: salesData.length, data: salesData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createOrder, getMyOrders, getAllOrders, updateOrderStatus, getSalesByCategory };
