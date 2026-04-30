const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    organizationName: { type: String, required: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    address: { type: String, required: true },
    description: { type: String, required: true },
    startDateISO: { type: String, required: true },
    endDateISO: { type: String, required: true },
    startHour: { type: Number, required: true, default: 9 },
    endHour: { type: Number, required: true, default: 17 },
    points: { type: Number, required: true, default: 0 },
    distanceKm: { type: Number, required: true, default: 0 },
    requiredSkills: { type: [String], default: [] },
    volunteerSlots: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },
    applicantCount: { type: Number, default: 0 },
    approvedVolunteersCount: { type: Number, default: 0 },
    approved: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    permissionPdf: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", EventSchema);
