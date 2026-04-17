const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    volunteerName: { type: String, required: true },
    volunteerEmail: { type: String, required: true },
    
    // Application details
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "withdrawn"],
      default: "pending"
    },
    
    // Volunteer info
    skills: [{ type: String }],
    bio: { type: String, default: null },
    availableHours: { type: Number, default: 0 },
    availability: { type: String, default: "" },
    assignedTask: { type: String, default: "" },
    assignedRole: { type: String, default: "" },
    
    // Response
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    
    // Attendance
    hoursLogged: { type: Number, default: 0 },
    attended: { type: Boolean, default: false },
    notes: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", ApplicationSchema);
