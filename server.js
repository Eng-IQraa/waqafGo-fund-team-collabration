const authRoutes = require("./src/routes/authRoutes");
const campaignRoutes = require("./src/routes/campaignRoutes");
const donationRoutes = require("./src/routes/donationRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
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
app.use("/api", donationRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Kaalmo Backend API is running",
    environment: process.env.NODE_ENV,
  });
});

// Connect and listen only for the production entry point. Exporting the app lets
// integration tests use it without opening a port or a second database connection.
if (require.main === module) {
  connectDB();
  app.listen(PORT, () => {
    console.log(`Kaalmo Backend running on port ${PORT}`);
  });
}

module.exports = app;
