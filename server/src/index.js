require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { connectDB } = require("./db");
const { adminAuth } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const eventRoutes = require("./routes/events");
const grievanceRoutes = require("./routes/grievances");
const organizerRoutes = require("./routes/organizer");
const rewardRoutes = require("./routes/rewards");
const postRoutes = require("./routes/posts");

// Validate required environment variables
const requiredEnvVars = ["JWT_SECRET", "MONGODB_URI"];
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[ERROR] Missing required environment variables: ${missing.join(", ")}`);
  console.error("[ERROR] Please create a .env file with these variables.");
  process.exit(1);
}

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true
  })
);

// Serve uploaded PDF documents
app.use("/uploads", express.static(path.join(__dirname, '..', 'uploads')));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/grievances", grievanceRoutes);
app.use("/api/organizer", organizerRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/posts", postRoutes);

// Admin dashboard route
app.get("/api/admin/dashboard", adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "static", "admin-dashboard.html"));
});

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
    app.listen(PORT, '0.0.0.0', () => console.log(`[API] running on http://0.0.0.0:${PORT}`));
  } catch (error) {
    console.error("[ERROR] Failed to start server:", error);
    process.exit(1);
  }
})();
