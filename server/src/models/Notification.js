const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "new_event",
        "event_approved",
        "complaint_reply",
        "complaint_resolved",
        "volunteer_joined_event",
        "badge_earned",
      ],
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);
