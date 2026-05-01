const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { auth, adminAuth } = require("../middleware/auth");
const Event = require("../models/Event");
const User = require("../models/User");
const Application = require("../models/Application");
const { syncAchievementBadges } = require("../lib/achievementSync");

const uploadPath = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

const router = express.Router();

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Public endpoint for authenticated users: only approved, posted events that have not closed
router.get("/", auth, async (req, res, next) => {
  try {
    const events = await Event.find({
      approved: true,
      isPublished: true,
      endDateISO: { $gte: todayISO() }
    }).sort({ startDateISO: 1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Published "happening now" events shown on volunteer dashboard
router.get("/happening", auth, async (req, res, next) => {
  try {
    const nowISO = todayISO();
    const events = await Event.find({
      approved: true,
      isPublished: true,
      startDateISO: { $lte: nowISO },
      endDateISO: { $gte: nowISO }
    }).sort({ startDateISO: 1, startHour: 1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Submitted events for current user (for approval + publish tracking)
router.get("/mine", auth, async (req, res, next) => {
  try {
    const events = await Event.find({ createdBy: req.user.userId }).sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Admin endpoint: view all events
router.get("/admin", adminAuth, async (req, res, next) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// Admin endpoint: create a new event
router.post("/admin", adminAuth, async (req, res, next) => {
  try {
    const {
      title,
      organizationName,
      category,
      location,
      description,
      startDateISO,
      endDateISO,
      points,
      distanceKm
    } = req.body;

    const event = await Event.create({
      title,
      organizationName,
      category,
      location,
      description,
      startDateISO,
      endDateISO,
      points: Number(points) || 0,
      distanceKm: Number(distanceKm) || 0,
      approved: false,
      status: 'pending',
      createdBy: req.user.userId
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, upload.single('permissionPdf'), async (req, res, next) => {
  try {
    const {
      title,
      organizationName,
      category,
      location,
      address,
      description,
      startDateISO,
      endDateISO,
      startHour,
      endHour,
      points,
      distanceKm
    } = req.body;

    const pdfPath = req.file ? `/uploads/${req.file.filename}` : null;

    const event = await Event.create({
      title,
      organizationName,
      category,
      location,
      address,
      description,
      startDateISO,
      endDateISO,
      startHour: Number(startHour) || 9,
      endHour: Number(endHour) || 17,
      points: Number(points) || 0,
      distanceKm: Number(distanceKm) || 0,
      approved: false,
      status: 'pending',
      permissionPdf: pdfPath,
      createdBy: req.user.userId
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

router.put("/admin/:id/approve", adminAuth, async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { approved: true, status: "approved" },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.put("/admin/:id/reject", adminAuth, async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { approved: false, status: "rejected", isPublished: false, publishedAt: null },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// Creator/organizer/admin can publish approved events to volunteer dashboard
router.put("/:id/publish", auth, async (req, res, next) => {
  try {
    const { publish } = req.body;
    if (typeof publish !== "boolean") {
      return res.status(400).json({ message: "publish must be a boolean" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isOwner =
      String(event.createdBy || "") === String(req.user.userId) ||
      String(event.organizerId || "") === String(req.user.userId);
    const canModerate = user.role === "admin";
    if (!isOwner && !canModerate) {
      return res.status(403).json({ message: "Not authorized to publish this event" });
    }

    if (publish && !event.approved) {
      return res.status(400).json({ message: "Only approved events can be published" });
    }

    event.isPublished = publish;
    event.publishedAt = publish ? new Date() : null;
    await event.save();
    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/join", auth, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.joinedEvents.some((joinedId) => String(joinedId) === String(event._id))) {
      user.joinedEvents.push(event._id);
      await user.save();
    }

    await Application.findOneAndUpdate(
      { eventId: event._id, volunteerId: user._id },
      {
        eventId: event._id,
        volunteerId: user._id,
        volunteerName: user.name,
        volunteerEmail: user.email,
        skills: user.interests || [],
        availability: "Joined from volunteer dashboard",
        status: "pending",
        attended: false,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const [applicantCount, approvedVolunteersCount] = await Promise.all([
      Application.countDocuments({ eventId: event._id, status: { $ne: "withdrawn" } }),
      Application.countDocuments({ eventId: event._id, status: "approved" }),
    ]);
    await Event.findByIdAndUpdate(event._id, { applicantCount, approvedVolunteersCount });

    res.json({ message: `Joined ${event.title} successfully.` });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/unjoin", auth, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.joinedEvents = user.joinedEvents.filter(
      (joinedId) => String(joinedId) !== String(event._id)
    );
    user.attendedEvents = user.attendedEvents.filter(
      (attendedId) => String(attendedId) !== String(event._id)
    );
    await user.save();

    const application = await Application.findOne({ eventId: event._id, volunteerId: user._id });
    if (application) {
      application.status = "withdrawn";
      await application.save();
    }

    const [applicantCount, approvedVolunteersCount] = await Promise.all([
      Application.countDocuments({ eventId: event._id, status: { $ne: "withdrawn" } }),
      Application.countDocuments({ eventId: event._id, status: "approved" }),
    ]);
    await Event.findByIdAndUpdate(event._id, { applicantCount, approvedVolunteersCount });

    res.json({ message: `Registration canceled for ${event.title}.` });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/attend", auth, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const eventEndDate = event.endDateISO ? new Date(event.endDateISO) : null;
    if (eventEndDate && !Number.isNaN(eventEndDate.getTime())) {
      const hourRaw = Number(event.endHour);
      const hour = Number.isFinite(hourRaw) ? Math.min(Math.max(Math.floor(hourRaw), 1), 24) : 23;
      if (hour >= 24) {
        eventEndDate.setHours(23, 59, 59, 999);
      } else {
        eventEndDate.setHours(hour, 0, 0, 0);
      }
    }

    if (!eventEndDate || Number.isNaN(eventEndDate.getTime()) || eventEndDate > new Date()) {
      return res.status(400).json({ message: "Attendance can only be marked after the event has ended." });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const application = await Application.findOne({ eventId: event._id, volunteerId: user._id });
    if (!application) {
      return res.status(400).json({ message: "You must join this event before marking attendance." });
    }

    if (application.status === "withdrawn" || application.status === "rejected") {
      return res.status(400).json({ message: "This registration is not eligible for attendance marking." });
    }

    if (application.attended) {
      return res.status(400).json({ message: "Attendance is already recorded for this event." });
    }

    application.attended = true;
    await application.save();

    const pointsToAdd = Number(event.points) || 0;
    if (!user.attendedEvents.some((attendedId) => String(attendedId) === String(event._id))) {
      user.attendedEvents.push(event._id);
    }
    user.points = Number(user.points || 0) + pointsToAdd;
    await user.save();

    await syncAchievementBadges(user._id);
    const fresh = await User.findById(user._id).select("points attendedEvents badges");

    res.json({
      message: `Attendance recorded for ${event.title}.`,
      eventId: String(event._id),
      attended: true,
      points: fresh.points,
      attendedEvents: fresh.attendedEvents,
      badges: fresh.badges,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/admin/:id/close", adminAuth, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    event.endDateISO = yesterday;
    await event.save();
    res.json(event);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
