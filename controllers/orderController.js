const Order   = require("../models/Order");
const Product = require("../models/Product");

const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No order items provided" });
    }

    let totalAmount     = 0;
    const resolvedItems = [];
    const stockUpdates  = [];

    for (const item of items) {
      if (!item.product || !item.quantity) {
        return res.status(400).json({ message: "Each item must have product ID and quantity" });
      }
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
        name:     product.name,
        price:    product.price,
        quantity: Number(item.quantity),
      });
      totalAmount += product.price * Number(item.quantity);
      stockUpdates.push({ product, quantity: Number(item.quantity) });
    }

    for (const { product, quantity } of stockUpdates) {
      product.stock -= quantity;
      await product.save();
    }

    const order = await Order.create({
      user:            req.user._id,
      items:           resolvedItems,
      totalAmount,
      shippingAddress: shippingAddress || "",
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("Create order error:", error.message);
    res.status(500).json({
      message: error.message,
      errors: error.errors
        ? Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v.message]))
        : undefined,
    });
  }
};

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
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSalesByCategory = async (req, res) => {
  try {
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
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createOrder, getMyOrders, getAllOrders, updateOrderStatus, getSalesByCategory };
