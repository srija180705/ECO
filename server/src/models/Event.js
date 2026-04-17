const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: String, required: true },
    detailedLocation: {
      addressLine1: { type: String, default: "" },
      area: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      landmark: { type: String, default: "" },
    },
    dateISO: { type: String, required: true },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    requiredSkills: { type: [String], default: [] },
    volunteerSlots: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },
    points: { type: Number, default: 0 },
    volunteerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming"
    },
    applicantCount: { type: Number, default: 0 },
    approvedVolunteersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", EventSchema);
