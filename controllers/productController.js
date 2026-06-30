const Product = require("../models/Product");

// @route  POST /api/products
// @access Private — Admin only
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, stock } = req.body;

    // Manual validation — gives clearer error than Mongoose default
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        message: "Please provide name, description, price, and category",
        received: { name, description, price, category }, // helps debug missing fields
      });
    }

    // req.user is guaranteed by protect middleware — but log if missing
    if (!req.user || !req.user._id) {
      console.error("PRODUCT_CREATE_ERROR: req.user is missing — protect middleware may have failed");
      return res.status(401).json({ message: "Not authorized" });
    }

    const product = await Product.create({
      name,
      description,
      price: Number(price),       // ensure number — frontend may send string
      category,
      image: image || "",
      stock: Number(stock) || 0,  // ensure number
      createdBy: req.user._id,
    });

    res.status(201).json(product);
  } catch (error) {
    // Full error log — shows Mongoose validation errors, cast errors, etc.
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({
      message: error.message,
      // Send validation details to frontend in development
      errors: error.errors
        ? Object.fromEntries(
            Object.entries(error.errors).map(([k, v]) => [k, v.message])
          )
        : undefined,
    });
  }
};

// @route  GET /api/products
// @access Public
const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({ message: error.message });
  }
};

// @route  GET /api/products/:id
// @access Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({ message: error.message });
  }
};

// @route  PUT /api/products/:id
// @access Private — Admin only
const updateProduct = async (req, res) => {
  try {
    // Coerce numeric fields in case frontend sends strings
    const update = { ...req.body };
    if (update.price !== undefined)  update.price  = Number(update.price);
    if (update.stock !== undefined)  update.stock  = Number(update.stock);

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
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

// @route  DELETE /api/products/:id
// @access Private — Admin only
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("DATABASE_SAVE_ERROR:", JSON.stringify(error, null, 2));
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
