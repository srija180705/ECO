require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const organizerRoutes = require("./routes/organizer");
const rewardRoutes = require("./routes/rewards");

// Validate required environment variables
const requiredEnvVars = ["JWT_SECRET", "MONGODB_URI"];
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[ERROR] Missing required environment variables: ${missing.join(", ")}`);
  console.error("[ERROR] Please create a .env file with these variables.");
  process.exit(1);
}

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true
  })
);

// Serve uploaded images
app.use("/uploads", express.static("uploads"));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizer", organizerRoutes);
app.use("/api/rewards", rewardRoutes);

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    app.listen(PORT, () => console.log(`[API] running on http://localhost:${PORT}`));
  } catch (error) {
    console.error("[ERROR] Failed to start server:", error);
    process.exit(1);
  }
})();
