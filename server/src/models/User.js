const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: "Volunteer" },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    city: { type: String, default: "Hyderabad" },
    role: { type: String, enum: ["volunteer", "organizer", "admin", "user"], default: "volunteer" },
    isVerified: { type: Boolean, default: true },
    permissionSlipUrl: { type: String, default: null },
    points: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    joinedEvents: { type: [String], default: [] },
    attendedEvents: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    createdEventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
