const express = require("express");
const { auth, adminAuth } = require("../middleware/auth");
const Grievance = require("../models/Grievance");
const User = require("../models/User");
const {
  notifyUserComplaintReply,
  notifyUserComplaintResolved,
} = require("../lib/notificationTriggers");

const router = express.Router();

async function generateUniqueReferenceId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let code = "";
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const referenceId = `#${code}`;
    const clash = await Grievance.exists({ referenceId });
    if (!clash) return referenceId;
  }
  return `#${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function wordsRoughlyUnder(description, maxWords) {
  if (!description || typeof description !== "string") return false;
  const words = description.trim().split(/\s+/).filter(Boolean);
  return words.length <= maxWords;
}

/** Logged-in user’s complaint history (includes admin reply once addressed). */
router.get("/mine", auth, async (req, res, next) => {
  try {
    const grievances = await Grievance.find({ createdBy: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(grievances);
  } catch (error) {
    next(error);
  }
});

/** Volunteer portal complaints — stored as Grievance (same collection Admin sees). */
router.post("/", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      complaintType,
      name,
      role,
      description,
      eventName: legacyEvent,
      organizationName: legacyOrg,
    } = req.body;

    // General complaint form (Priority 7-style)
    if (complaintType || role || name) {
      const trimmedDesc = typeof description === "string" ? description.trim() : "";
      if (!trimmedDesc) return res.status(400).json({ message: "Description is required" });
      if (!wordsRoughlyUnder(trimmedDesc, 600)) {
        return res.status(400).json({ message: "Description must be at most 600 words" });
      }
      const trimmedName = typeof name === "string" ? name.trim() : "";
      if (!trimmedName) return res.status(400).json({ message: "Name is required" });
      const trimmedRole = typeof role === "string" ? role.trim() : "";
      if (!trimmedRole) return res.status(400).json({ message: "Role is required" });
      const trimmedType = typeof complaintType === "string" ? complaintType.trim() : "";
      if (!trimmedType) return res.status(400).json({ message: "Complaint type is required" });

      const referenceId = await generateUniqueReferenceId();
      const grievance = await Grievance.create({
        referenceId,
        submitterName: trimmedName,
        role: trimmedRole,
        complaintType: trimmedType,
        userEmail: user.email,
        description: trimmedDesc,
        status: "open",
        createdBy: user._id,
      });

      return res.status(201).json({
        success: true,
        referenceId: grievance.referenceId,
        grievance,
      });
    }

    // Legacy body (event-based grievance)
    const eventName = legacyEvent ? String(legacyEvent).trim() : "";
    const organizationName = legacyOrg ? String(legacyOrg).trim() : "";
    const desc = typeof description === "string" ? description.trim() : "";
    if (!eventName || !organizationName || !desc) {
      return res.status(400).json({
        message: "Provide complaint fields (name, role, complaintType, description) or legacy event fields.",
      });
    }

    const grievance = await Grievance.create({
      userEmail: user.email,
      eventName,
      organizationName,
      description: desc,
      status: "open",
      createdBy: user._id,
    });

    res.status(201).json(grievance);
  } catch (error) {
    next(error);
  }
});

router.get("/admin", adminAuth, async (req, res, next) => {
  try {
    const grievances = await Grievance.find().sort({ createdAt: -1 });
    res.json(grievances);
  } catch (error) {
    next(error);
  }
});

router.put("/admin/:id/resolve", adminAuth, async (req, res, next) => {
  try {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });
    grievance.status = "resolved";
    await grievance.save();
    setImmediate(() => {
      notifyUserComplaintResolved(grievance).catch((e) =>
        console.error("[notifications] grievance resolve:", e.message)
      );
    });
    res.json(grievance);
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/:id", adminAuth, async (req, res, next) => {
  try {
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });
    const { adminResponse, adminNotes, status } = req.body;
    const prevReply = grievance.adminResponse || "";
    if (typeof adminResponse === "string") grievance.adminResponse = adminResponse.trim();
    if (typeof adminNotes === "string") grievance.adminNotes = adminNotes.trim();
    if (status === "resolved" || status === "open") grievance.status = status;
    await grievance.save();

    const replyAdded =
      typeof req.body.adminResponse === "string" &&
      grievance.adminResponse &&
      grievance.adminResponse !== prevReply;
    if (replyAdded) {
      setImmediate(() => {
        notifyUserComplaintReply(grievance, grievance.adminResponse).catch((e) =>
          console.error("[notifications] complaint reply:", e.message)
        );
      });
    }

    res.json({ success: true, grievance });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
