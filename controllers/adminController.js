const User    = require("../models/User");
const Product = require("../models/Product");
const Order   = require("../models/Order");

const getStats = async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: { totalUsers, totalProducts, totalOrders },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStats };
