function useMemoryDb() {
  const v = String(process.env.USE_MEMORY_DB || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

let memoryServerInstance = null;

/**
 * When USE_MEMORY_DB=1, starts mongodb-memory-server and returns its URI.
 * @param {{ registerSignals?: boolean }} [options]
 */
async function resolveMongoUri(options = {}) {
  const registerSignals = options.registerSignals !== false;

  if (!useMemoryDb()) {
    return {
      uri: process.env.MONGODB_URI,
      stopMemoryServer: async () => {},
    };
  }

  const { MongoMemoryServer } = require("mongodb-memory-server");
  memoryServerInstance = await MongoMemoryServer.create();
  const uri = memoryServerInstance.getUri();
  console.log(
    "[DB] USE_MEMORY_DB: in-memory MongoDB (data is discarded when the process exits — dev only)"
  );

  const stop = async () => {
    if (!memoryServerInstance) return;
    try {
      await memoryServerInstance.stop();
    } catch (e) {
      console.warn("[DB] memory mongo stop:", e.message);
    }
    memoryServerInstance = null;
  };

  if (registerSignals) {
    const onSig = async () => {
      await stop();
    };
    process.once("SIGINT", onSig);
    process.once("SIGTERM", onSig);
  }

  return { uri, stopMemoryServer: stop };
}

module.exports = { useMemoryDb, resolveMongoUri };
