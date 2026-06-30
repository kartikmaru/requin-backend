const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

connectDB();

const app = express();

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl} | Origin: ${req.headers.origin || "no-origin"}`);
  next();
});

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://requin-frontend.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Requin Backend API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    time: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", require("./routes/authRoutes"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: `Not Found - ${req.originalUrl}`,
    stack: null,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});