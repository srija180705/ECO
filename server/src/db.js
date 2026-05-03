const mongoose = require("mongoose");

async function cleanupLegacyEventGeoIndex() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const eventsCollection = db.collection("events");
    const indexes = await eventsCollection.indexes();
    const geoIndexes = indexes.filter((index) =>
      Object.values(index.key || {}).some((value) => value === "2dsphere" || value === "2d")
    );

    for (const index of geoIndexes) {
      await eventsCollection.dropIndex(index.name);
      console.log(`[DB] Dropped legacy geo index: ${index.name}`);
    }
  } catch (error) {
    console.warn("[DB] Skipped geo index cleanup:", error.message);
  }
}

async function connectDB(uri) {
  const trimmed = typeof uri === "string" ? uri.trim() : "";
  if (!trimmed) {
    throw new Error(
      "Database URI is missing. Set MONGODB_URI or USE_MEMORY_DB=1 in server/.env."
    );
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(trimmed, {
    serverSelectionTimeoutMS: 12_000,
  });
  await cleanupLegacyEventGeoIndex();
  console.log("[DB] Connected");
}

module.exports = { connectDB };
