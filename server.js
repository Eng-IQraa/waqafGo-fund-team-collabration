const authRoutes = require("./src/routes/authRoutes");
const campaignRoutes = require("./src/routes/campaignRoutes");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const connectDB = require("./src/config/db");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// Database
connectDB();

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", limiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Kaalmo Backend API is running",
    environment: process.env.NODE_ENV,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Kaalmo Backend running on port ${PORT}`);
});