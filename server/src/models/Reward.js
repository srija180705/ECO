const mongoose = require("mongoose");

/** Volunteer achievements (badges): unlock via lifetime points or events attended. */
const RewardSchema = new mongoose.Schema(
  {
    badgeId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    kind: { type: String, enum: ["points", "events"], required: true },
    threshold: { type: Number, required: true, min: 0 },
    iconEmoji: { type: String, default: "🏅" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reward", RewardSchema);
