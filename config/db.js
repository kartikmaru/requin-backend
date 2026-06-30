const mongoose = require("mongoose");

// Use Google DNS — fixes Node.js SRV lookup failure on some ISPs/routers
// Node's built-in DNS resolver sometimes can't resolve mongodb+srv:// SRV records

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host} | DB: ${conn.connection.db.databaseName}`);
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
