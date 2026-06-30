const mongoose = require("mongoose");
const dns = require("dns");

/**
 * connectDB — establishes MongoDB Atlas connection.
 *
 * DNS FIX:
 * Both Render's servers AND some local ISPs fail to resolve MongoDB Atlas
 * SRV records (_mongodb._tcp.*) using their default DNS resolver.
 * Setting Google Public DNS (8.8.8.8) before connecting fixes this.
 * This is a well-known issue with Node.js's built-in DNS module.
 *
 * TIMEOUTS:
 * serverSelectionTimeoutMS — how long Mongoose tries to find a usable server.
 * connectTimeoutMS         — how long to wait for a single TCP connection.
 * socketTimeoutMS          — how long to wait for a response on an open socket.
 * On Render free tier, Atlas connections can be slow — 10s is safe.
 */
const connectDB = async () => {
  // Override Node.js DNS resolver → Google Public DNS
  // Fixes: "querySrv ECONNREFUSED _mongodb._tcp.*.mongodb.net"
  dns.setServers(["8.8.8.8", "8.8.4.4"]);

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // give up finding a server after 10s
      connectTimeoutMS:         10000, // TCP connection timeout
      socketTimeoutMS:          45000, // idle socket timeout
    });

    console.log(
      `MongoDB Connected: ${conn.connection.host} | DB: ${conn.connection.db.databaseName}`
    );
  } catch (error) {
    // Log full error so Render logs show the real failure reason
    console.error("MONGO_CONNECTION_ERROR:", error.message);
    console.error("MONGO_FULL_ERROR:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
};

module.exports = connectDB;
