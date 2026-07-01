const Product = require("../models/Product");

const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, image, stock } = req.body;
    if (!name || !description || !price || !category) {
      return res.status(400).json({ message: "Please provide name, description, price, and category" });
    }
    const product = await Product.create({
      name,
      description,
      price:     Number(price),
      category,
      image:     image || "",
      stock:     Number(stock) || 0,
      createdBy: req.user._id,
    });
    res.status(201).json(product);
  } catch (error) {
    console.error("Create product error:", error.message);
    res.status(500).json({
      message: error.message,
      errors: error.errors
        ? Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v.message]))
        : undefined,
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.price !== undefined) update.price = Number(update.price);
    if (update.stock !== undefined) update.stock = Number(update.stock);
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    console.error("Update product error:", error.message);
    res.status(500).json({
      message: error.message,
      errors: error.errors
        ? Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v.message]))
        : undefined,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct };
