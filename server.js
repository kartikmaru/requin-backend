const express      = require("express");
const cors         = require("cors");
const dotenv       = require("dotenv");
const cookieParser = require("cookie-parser"); // needed for req.cookies to work
const connectDB    = require("./config/db");

// Load env variables first — everything else depends on them
dotenv.config();

connectDB();

const app = express();

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(
    `[REQ] ${req.method} ${req.originalUrl} | Origin: ${req.headers.origin || "no-origin"}`
  );
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
// credentials:true is required for cookies to be sent cross-origin.
// The origin function whitelists exactly the origins we trust.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://requin-frontend.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. Postman, server-to-server, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("[CORS] Blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,                               // required for cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Register CORS before everything else, including preflight handler
app.use(cors(corsOptions));

// Handle preflight OPTIONS for all routes
app.options("*", cors(corsOptions));

// ── Body + Cookie parsers ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // MUST be before routes so req.cookies is populated

// ── Health / root ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Requin Backend API is running" });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    time:    new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders",   require("./routes/orderRoutes"));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || "development"}`);
});
