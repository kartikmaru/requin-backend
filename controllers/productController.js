const Product = require("../models/Product");

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA REQUIRED FIELDS AUDIT (Product.js):
//   name        → required ✅  frontend sends: "name"
//   description → required ✅  frontend sends: "description"
//   price       → required ✅  frontend sends: "price" (string from form — coerced to Number)
//   category    → required ✅  frontend sends: "category"
//   image       → NOT required (default: "")
//   stock       → NOT required (default: 0)
//   createdBy   → required ✅  set from req.user._id — NOT from frontend body
// ─────────────────────────────────────────────────────────────────────────────

// @route  POST /api/products
// @access Private — Admin only
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, stock } = req.body;

    // DEBUG LOG — shows exactly what the frontend sent
    console.log("DEBUG: Attempting to save data:", JSON.stringify(req.body, null, 2));

    // Manual validation before touching DB
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        message: "Please provide name, description, price, and category",
        received: { name, description, price, category },
      });
    }

    // Guard: req.user must exist (set by protect middleware)
    if (!req.user || !req.user._id) {
      console.error("PRODUCT_CREATE_ERROR: req.user missing — protect middleware failed");
      return res.status(401).json({ message: "Not authorized" });
    }

    // await is present — Product.create() saves to MongoDB
    const product = await Product.create({
      name,
      description,
      price:     Number(price),      // coerce: form sends strings
      category,
      image:     image || "",
      stock:     Number(stock) || 0, // coerce: form sends strings
      createdBy: req.user._id,       // NOT from req.body — from JWT via protect middleware
    });

    res.status(201).json(product);
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

// @route  GET /api/products
// @access Public
const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    console.error("DEBUG: Save Failed! Error:", error);
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
    console.error("DEBUG: Save Failed! Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @route  PUT /api/products/:id
// @access Private — Admin only
const updateProduct = async (req, res) => {
  try {
    console.log("DEBUG: Attempting to save data:", JSON.stringify(req.body, null, 2));

    // Coerce numeric fields — form inputs arrive as strings
    const update = { ...req.body };
    if (update.price !== undefined) update.price = Number(update.price);
    if (update.stock !== undefined) update.stock = Number(update.stock);

    // await is present — findByIdAndUpdate saves to MongoDB
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

// @route  DELETE /api/products/:id
// @access Private — Admin only
const deleteProduct = async (req, res) => {
  try {
    // await is present — findByIdAndDelete removes from MongoDB
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("DEBUG: Save Failed! Error:", error);
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
