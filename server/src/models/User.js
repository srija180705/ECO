const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: "Volunteer" },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "user", enum: ["user", "admin"] },
    city: { type: String, default: "Hyderabad" },
    points: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    joinedEventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    interests: { type: [String], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
