const mongoose = require("mongoose");

const GeoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && Number.isFinite(n));
        },
        message: "coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false }
);

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
    /** GeoJSON Point for maps / geo queries; stored as [lng, lat]. */
    coordinates: { type: GeoPointSchema, default: undefined },
    /** Volunteers who joined from the dashboard (ObjectIds). */
    volunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    /** Max volunteers (0 = no limit). Mirrors volunteerSlots when created via organizer form. */
    maxVolunteers: { type: Number, default: 0 },
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

EventSchema.index({ coordinates: "2dsphere" }, { sparse: true });

module.exports = mongoose.model("Event", EventSchema);
