const mongoose = require("mongoose");

const GrievanceSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    eventName: { type: String, required: true },
    organizationName: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, default: "open", enum: ["open", "resolved"] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Grievance", GrievanceSchema);
