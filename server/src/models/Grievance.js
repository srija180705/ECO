const mongoose = require("mongoose");

const GrievanceSchema = new mongoose.Schema(
  {
    /** Human-readable id shown to user after submit, e.g. #AB12CD */
    referenceId: { type: String, sparse: true, unique: true },
    /** Display name on complaint form (may differ from account name). */
    submitterName: { type: String, default: "" },
    /** Volunteer | Organizer | User — portal complaints */
    role: { type: String, default: "" },
    /** Technical Issue | … — portal complaints */
    complaintType: { type: String, default: "" },

    userEmail: { type: String, required: true },
    /** Legacy: grievance tied to an event name */
    eventName: { type: String, default: "" },
    organizationName: { type: String, default: "" },
    description: { type: String, required: true },
    status: { type: String, default: "open", enum: ["open", "resolved"] },
    adminNotes: { type: String, default: "" },
    adminResponse: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Grievance", GrievanceSchema);
