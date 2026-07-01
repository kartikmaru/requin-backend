const mongoose = require("mongoose");
const dns = require("dns");

const connectDB = async () => {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host} | DB: ${conn.connection.db.databaseName}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
