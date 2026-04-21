const express = require("express");
const { auth } = require("../middleware/auth");
const Event = require("../models/Event");
const Application = require("../models/Application");
const User = require("../models/User");

const router = express.Router();

function normalizeTimeToMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

function hasTimeOverlap(aStart, aEnd, bStart, bEnd) {
  if ([aStart, aEnd, bStart, bEnd].some((v) => v === null)) return false;
  return aStart < bEnd && bStart < aEnd;
}

async function verifyOrganizer(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "organizer" || user.isVerified === false) {
      return res.status(403).json({ message: "Only verified organizers can access this page" });
    }
    req.organizer = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function updateEventCounts(eventId) {
  const [applicantCount, approvedVolunteersCount] = await Promise.all([
    Application.countDocuments({ eventId }),
    Application.countDocuments({ eventId, status: "approved" }),
  ]);
  await Event.findByIdAndUpdate(eventId, { applicantCount, approvedVolunteersCount });
}

router.use(auth, verifyOrganizer);

router.get("/events", async (req, res, next) => {
  try {
    const events = await Event.find({ organizerId: req.organizer._id }).sort({ dateISO: 1, startTime: 1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const events = await Event.find({ organizerId: req.organizer._id }).sort({ dateISO: 1, startTime: 1 });
    const eventIds = events.map((e) => e._id);
    const applications = await Application.find({ eventId: { $in: eventIds } });

    const totalEvents = events.length;
    const upcoming = events.filter((e) => e.status === "upcoming" || e.status === "ongoing");
    const past = events.filter((e) => e.status === "completed" || e.status === "cancelled");

    const appStats = {
      pending: applications.filter((a) => a.status === "pending").length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    };

    const volunteersPerEvent = events.map((event) => {
      const apps = applications.filter((a) => String(a.eventId) === String(event._id));
      const approved = apps.filter((a) => a.status === "approved").length;
      const rejected = apps.filter((a) => a.status === "rejected").length;
      return {
        eventId: event._id,
        title: event.title,
        totalApplicants: apps.length,
        approvedVolunteers: approved,
        pending: apps.filter((a) => a.status === "pending").length,
        rejected,
      };
    });

    res.json({
      totalEvents,
      upcomingEvents: upcoming.length,
      pastEvents: past.length,
      appStats,
      volunteersPerEvent,
      upcomingEventsList: upcoming,
      pastEventsList: past,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/events", async (req, res, next) => {
  try {
    const {
      title,
      description,
      dateISO,
      startTime,
      endTime,
      location,
      detailedLocation,
      requiredSkills = [],
      volunteerSlots = 0,
      imageUrl = "",
      category = "environment",
    } = req.body;

    if (!title || !description || !dateISO || !location) {
      return res.status(400).json({ message: "title, description, dateISO and location are required" });
    }

    if (
      !detailedLocation
      || !detailedLocation.addressLine1
      || !detailedLocation.city
      || !detailedLocation.state
      || !detailedLocation.postalCode
    ) {
      return res.status(400).json({
        message: "Detailed location is required: addressLine1, city, state and postalCode",
      });
    }

    const existingAtLocation = await Event.find({
      organizerId: req.organizer._id,
      location: { $regex: `^${String(location).trim()}$`, $options: "i" },
      dateISO,
      status: { $ne: "cancelled" },
    });

    const candidateStart = normalizeTimeToMinutes(startTime);
    const candidateEnd = normalizeTimeToMinutes(endTime);
    const conflictEvent = existingAtLocation.find((event) =>
      hasTimeOverlap(
        candidateStart,
        candidateEnd,
        normalizeTimeToMinutes(event.startTime),
        normalizeTimeToMinutes(event.endTime)
      )
    );

    if (conflictEvent) {
      return res.status(409).json({
        message: "Event conflict detected at the same location and overlapping time",
        conflict: {
          title: conflictEvent.title,
          dateISO: conflictEvent.dateISO,
          startTime: conflictEvent.startTime,
          endTime: conflictEvent.endTime,
          location: conflictEvent.location,
        },
      });
    }

    const event = await Event.create({
      title,
      description,
      category,
      organizerId: req.organizer._id,
      location,
      detailedLocation: {
        addressLine1: detailedLocation.addressLine1 || "",
        area: detailedLocation.area || "",
        city: detailedLocation.city || "",
        state: detailedLocation.state || "",
        postalCode: detailedLocation.postalCode || "",
        landmark: detailedLocation.landmark || "",
      },
      dateISO,
      startTime: startTime || "",
      endTime: endTime || "",
      requiredSkills,
      volunteerSlots: Number(volunteerSlots) || 0,
      imageUrl,
      status: "upcoming",
      points: 25,
    });

    await User.findByIdAndUpdate(req.organizer._id, { $addToSet: { createdEventIds: event._id } });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

router.put("/events/:eventId", async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.eventId, organizerId: req.organizer._id });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const nextDate = req.body.dateISO || event.dateISO;
    const nextLocation = req.body.location || event.location;
    const nextStart = req.body.startTime || event.startTime;
    const nextEnd = req.body.endTime || event.endTime;

    const siblingEvents = await Event.find({
      _id: { $ne: event._id },
      organizerId: req.organizer._id,
      location: { $regex: `^${String(nextLocation).trim()}$`, $options: "i" },
      dateISO: nextDate,
      status: { $ne: "cancelled" },
    });

    const conflictEvent = siblingEvents.find((candidate) =>
      hasTimeOverlap(
        normalizeTimeToMinutes(nextStart),
        normalizeTimeToMinutes(nextEnd),
        normalizeTimeToMinutes(candidate.startTime),
        normalizeTimeToMinutes(candidate.endTime)
      )
    );

    if (conflictEvent) {
      return res.status(409).json({
        message: "Event conflict detected at the same location and overlapping time",
      });
    }

    Object.assign(event, {
      title: req.body.title ?? event.title,
      description: req.body.description ?? event.description,
      dateISO: nextDate,
      startTime: nextStart,
      endTime: nextEnd,
      location: nextLocation,
      detailedLocation: req.body.detailedLocation ?? event.detailedLocation,
      requiredSkills: req.body.requiredSkills ?? event.requiredSkills,
      volunteerSlots: req.body.volunteerSlots ?? event.volunteerSlots,
      imageUrl: req.body.imageUrl ?? event.imageUrl,
      category: req.body.category ?? event.category,
      status: req.body.status ?? event.status,
    });

    await event.save();
    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.delete("/events/:eventId", async (req, res, next) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.eventId, organizerId: req.organizer._id });
    if (!event) return res.status(404).json({ message: "Event not found" });
    await Application.deleteMany({ eventId: event._id });
    await User.findByIdAndUpdate(req.organizer._id, { $pull: { createdEventIds: event._id } });
    res.json({ message: "Event deleted" });
  } catch (error) {
    next(error);
  }
});

router.get("/event/:eventId/applications", async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.eventId, organizerId: req.organizer._id });
    if (!event) return res.status(404).json({ message: "Event not found" });

    const applications = await Application.find({ eventId: req.params.eventId }).sort({ createdAt: -1 });
    res.json({ event, applications });
  } catch (error) {
    next(error);
  }
});

router.patch("/application/:appId/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["pending", "approved", "rejected", "withdrawn"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const application = await Application.findById(req.params.appId);
    if (!application) return res.status(404).json({ message: "Application not found" });

    const event = await Event.findOne({ _id: application.eventId, organizerId: req.organizer._id });
    if (!event) return res.status(403).json({ message: "Not authorized" });

    application.status = status;
    if (status === "approved") application.approvedAt = new Date();
    if (status === "rejected") application.rejectedAt = new Date();
    await application.save();
    await updateEventCounts(event._id);
    res.json(application);
  } catch (error) {
    next(error);
  }
});

router.patch("/application/:appId/assign-role", async (req, res, next) => {
  try {
    const { assignedRole = "", assignedTask = "" } = req.body;
    const application = await Application.findById(req.params.appId);
    if (!application) return res.status(404).json({ message: "Application not found" });

    const event = await Event.findOne({ _id: application.eventId, organizerId: req.organizer._id });
    if (!event) return res.status(403).json({ message: "Not authorized" });

    application.assignedRole = assignedRole;
    application.assignedTask = assignedTask;
    await application.save();
    res.json(application);
  } catch (error) {
    next(error);
  }
});

router.get("/reports", async (req, res, next) => {
  try {
    const events = await Event.find({ organizerId: req.organizer._id });
    const eventIds = events.map((event) => event._id);
    const applications = await Application.find({ eventId: { $in: eventIds } });

    const attendance = applications.filter((a) => a.attended).length;
    const totalHours = applications.reduce((sum, a) => sum + (a.hoursLogged || 0), 0);
    const approved = applications.filter((a) => a.status === "approved").length;

    res.json({
      totalEvents: events.length,
      totalApplications: applications.length,
      approvedVolunteers: approved,
      attendanceCount: attendance,
      volunteerHoursLogged: totalHours,
      participationRate: applications.length ? Math.round((attendance / applications.length) * 100) : 0,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/communications/announcement", async (req, res) => {
  const { message = "", eventId = null } = req.body;
  if (!message.trim()) return res.status(400).json({ message: "Announcement message is required" });
  res.json({
    success: true,
    sentAt: new Date().toISOString(),
    eventId,
    preview: message,
  });
});

module.exports = router;
