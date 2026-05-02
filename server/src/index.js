require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { connectDB } = require("./db");
const { useMemoryDb, resolveMongoUri } = require("./memoryMongo");
const { adminAuth } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const eventRoutes = require("./routes/events");
const grievanceRoutes = require("./routes/grievances");
const organizerRoutes = require("./routes/organizer");
const rewardRoutes = require("./routes/rewards");
const postRoutes = require("./routes/posts");
const notificationRoutes = require("./routes/notifications");
const Reward = require("./models/Reward");
const { SEED_ACHIEVEMENTS } = require("./lib/achievementDefinitions");

async function ensureAchievementsOnBoot() {
  try {
    const withBadgeId = await Reward.countDocuments({
      badgeId: { $exists: true, $nin: [null, ""] },
    });
    if (withBadgeId > 0) return;
    await rewardRoutes.purgeLegacyRewards();
    await rewardRoutes.upsertAchievementSeeds(SEED_ACHIEVEMENTS);
    console.log("[API] Seeded default achievement badges (migrated legacy catalog if needed)");
  } catch (e) {
    console.warn("[API] Achievement auto-seed skipped:", e.message);
  }
}

// Validate required environment variables
const requiredEnvVars = ["JWT_SECRET"];
if (!useMemoryDb()) requiredEnvVars.push("MONGODB_URI");
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[ERROR] Missing required environment variables: ${missing.join(", ")}`);
  console.error("[ERROR] Please create a .env file with these variables.");
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication token is required"));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload;
    next();
  } catch (error) {
    next(new Error("Invalid authentication token"));
  }
});

io.on("connection", (socket) => {
  socket.join("community");
});

app.set("io", io);

app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
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
app.use("/api/notifications", notificationRoutes);

// Admin dashboard route
app.get("/api/admin/dashboard", adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "static", "admin-dashboard.html"));
});

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  if (err.type === 'entity.parse.failed') {
    console.error('[ERROR] Raw request body:', req.rawBody);
  }
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    const { uri } = await resolveMongoUri();
    await connectDB(uri);
    // In-memory Mongo is a fresh DB each server process; CLI seed targets a different process, so seed here too.
    if (useMemoryDb()) {
      const { runSeedContent } = require("./seed");
      await runSeedContent();
      console.log("[API] Seed data ensured for in-memory DB (admin login matches server/src/seed.js)");
    }
    await ensureAchievementsOnBoot();
    server.listen(PORT, "0.0.0.0", () => console.log(`[API] running on http://0.0.0.0:${PORT}`));
  } catch (error) {
    console.error("[ERROR] Failed to start server:", error.message || error);
    const msg = String(error.message || error);
    const code = error.code || error.cause?.code;
    if (
      code === "ENOTFOUND" ||
      msg.includes("querySrv") ||
      msg.includes("_mongodb._tcp")
    ) {
      console.error(`
[MongoDB] DNS lookup failed for mongodb+srv (Atlas). Try another network/VPN, or set USE_MEMORY_DB=1 in server/.env for local dev (run npm install in server/ first).
`);
    } else if (
      msg.includes("ECONNREFUSED") ||
      msg.includes("connect ECONNREFUSED")
    ) {
      console.error(`
[MongoDB] Connection refused — start MongoDB locally or set USE_MEMORY_DB=1 in server/.env.
`);
    }
    process.exit(1);
  }
})();
