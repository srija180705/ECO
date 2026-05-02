const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { auth } = require("../middleware/auth");
const Event = require("../models/Event");
const Application = require("../models/Application");
const User = require("../models/User");
const { parseCoordinates } = require("../lib/eventCoordinates");
const { confirmAttendanceByOrganizer } = require("../lib/confirmAttendance");

const router = express.Router();

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

function normalizeHour(value) {
  const hour = Number(value);
  if (!Number.isFinite(hour)) return null;
  return Math.min(24, Math.max(1, Math.floor(hour)));
}

function hourToMinutes(value) {
  const hour = normalizeHour(value);
  return hour === null ? null : hour * 60;
}

function hasTimeOverlap(aStart, aEnd, bStart, bEnd) {
  if ([aStart, aEnd, bStart, bEnd].some((v) => v === null)) return false;
  return aStart < bEnd && bStart < aEnd;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function hasDateOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

function getEventDate(event) {
  return event.startDateISO || event.dateISO || "";
}

function getEventEndDate(event) {
  return event.endDateISO || event.startDateISO || event.dateISO || "";
}

function organizerEventQuery(organizerId, extra) {
  extra = extra || {};
  return Object.assign({}, extra, {
    $or: [
      { createdBy: organizerId },
      { organizerId },
    ],
  });
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

router.get("/calendar-events", async (req, res, next) => {
  try {
    const events = await Event.find({ approved: true }).sort({ startDateISO: 1, startHour: 1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.get("/events", async (req, res, next) => {
  try {
    const events = await Event.find(organizerEventQuery(req.organizer._id)).sort({ startDateISO: 1, startHour: 1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const events = await Event.find(organizerEventQuery(req.organizer._id)).sort({ startDateISO: 1, startHour: 1 });
    const eventIds = events.map((e) => e._id);
    const applications = await Application.find({ eventId: { $in: eventIds } });

    const totalEvents = events.length;
    const upcoming = events.filter((e) => getEventEndDate(e) >= todayISO());
    const past = events.filter((e) => getEventEndDate(e) < todayISO());

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

router.post("/events", upload.single('permissionPdf'), async (req, res, next) => {
  try {
    const {
      title,
      organizationName,
      category = "cleanup",
      location,
      address,
      description,
      startDateISO,
      endDateISO,
      startHour,
      endHour,
      points,
      distanceKm,
      requiredSkills = [],
      volunteerSlots = 0,
      imageUrl = "",
    } = req.body;

    if (!title || !description || !startDateISO || !endDateISO || !location || !address) {
      return res.status(400).json({ message: "title, description, start/end dates, location and address are required" });
    }

    const existingAtLocation = await Event.find(
      organizerEventQuery(req.organizer._id, {
        location: { $regex: `^${String(location).trim()}$`, $options: "i" },
        status: { $ne: "rejected" },
      })
    );

    const candidateStart = hourToMinutes(startHour);
    const candidateEnd = hourToMinutes(endHour);
    const conflictEvent = existingAtLocation.find((event) =>
      hasDateOverlap(startDateISO, endDateISO, getEventDate(event), getEventEndDate(event)) &&
      hasTimeOverlap(
        candidateStart,
        candidateEnd,
        hourToMinutes(event.startHour),
        hourToMinutes(event.endHour)
      )
    );

    if (conflictEvent) {
      return res.status(409).json({
        message: "Event conflict detected at the same location and overlapping time",
        conflict: {
          title: conflictEvent.title,
          startDateISO: conflictEvent.startDateISO,
          endDateISO: conflictEvent.endDateISO,
          startHour: conflictEvent.startHour,
          endHour: conflictEvent.endHour,
          location: conflictEvent.location,
        },
      });
    }

    const slots = Number(volunteerSlots) || 0;
    const coords = parseCoordinates(req.body);

    const event = await Event.create({
      title,
      organizationName: organizationName || req.organizer.name,
      category,
      location,
      address,
      description,
      startDateISO,
      endDateISO,
      startHour: normalizeHour(startHour) || 9,
      endHour: normalizeHour(endHour) || 17,
      points: Number(points) || 0,
      distanceKm: Number(distanceKm) || 0,
      coordinates: coords || undefined,
      maxVolunteers: slots,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : String(requiredSkills || '').split(',').map((item) => item.trim()).filter(Boolean),
      volunteerSlots: slots,
      imageUrl,
      approved: false,
      status: "pending",
      permissionPdf: req.file ? `/uploads/${req.file.filename}` : null,
      createdBy: req.organizer._id,
      organizerId: req.organizer._id,
    });

    await User.findByIdAndUpdate(req.organizer._id, { $addToSet: { createdEventIds: event._id } });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

router.put("/events/:eventId", upload.single('permissionPdf'), async (req, res, next) => {
  try {
    const event = await Event.findOne(organizerEventQuery(req.organizer._id, { _id: req.params.eventId }));
    if (!event) return res.status(404).json({ message: "Event not found" });

    const nextStartDate = req.body.startDateISO || event.startDateISO;
    const nextEndDate = req.body.endDateISO || event.endDateISO;
    const nextLocation = req.body.location || event.location;
    const nextStart = req.body.startHour || event.startHour;
    const nextEnd = req.body.endHour || event.endHour;

    const siblingEvents = await Event.find(
      organizerEventQuery(req.organizer._id, {
        _id: { $ne: event._id },
        location: { $regex: `^${String(nextLocation).trim()}$`, $options: "i" },
        status: { $ne: "rejected" },
      })
    );

    const conflictEvent = siblingEvents.find((candidate) =>
      hasDateOverlap(nextStartDate, nextEndDate, getEventDate(candidate), getEventEndDate(candidate)) &&
      hasTimeOverlap(
        hourToMinutes(nextStart),
        hourToMinutes(nextEnd),
        hourToMinutes(candidate.startHour),
        hourToMinutes(candidate.endHour)
      )
    );

    if (conflictEvent) {
      return res.status(409).json({
        message: "Event conflict detected at the same location and overlapping time",
      });
    }

    const coords = parseCoordinates(req.body);
    const nextSlots =
      req.body.volunteerSlots !== undefined ? Number(req.body.volunteerSlots) || 0 : event.volunteerSlots;

    Object.assign(event, {
      title: req.body.title !== undefined ? req.body.title : event.title,
      organizationName: req.body.organizationName !== undefined ? req.body.organizationName : event.organizationName,
      category: req.body.category !== undefined ? req.body.category : event.category,
      location: nextLocation,
      address: req.body.address !== undefined ? req.body.address : event.address,
      description: req.body.description !== undefined ? req.body.description : event.description,
      startDateISO: nextStartDate,
      endDateISO: nextEndDate,
      startHour: normalizeHour(nextStart) || event.startHour,
      endHour: normalizeHour(nextEnd) || event.endHour,
      points: req.body.points !== undefined ? Number(req.body.points) || 0 : event.points,
      distanceKm: req.body.distanceKm !== undefined ? Number(req.body.distanceKm) || 0 : event.distanceKm,
      requiredSkills: req.body.requiredSkills !== undefined
        ? (Array.isArray(req.body.requiredSkills) ? req.body.requiredSkills : String(req.body.requiredSkills).split(',').map((item) => item.trim()).filter(Boolean))
        : event.requiredSkills,
      volunteerSlots: nextSlots,
      maxVolunteers: req.body.volunteerSlots !== undefined ? nextSlots : event.maxVolunteers,
      imageUrl: req.body.imageUrl !== undefined ? req.body.imageUrl : event.imageUrl,
      permissionPdf: req.file ? `/uploads/${req.file.filename}` : event.permissionPdf,
      approved: false,
      status: "pending",
      isPublished: false,
    });

    if (coords) {
      event.coordinates = coords;
    }

    await event.save();
    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.delete("/events/:eventId", async (req, res, next) => {
  try {
    const event = await Event.findOneAndDelete(organizerEventQuery(req.organizer._id, { _id: req.params.eventId }));
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
    const event = await Event.findOne(organizerEventQuery(req.organizer._id, { _id: req.params.eventId }));
    if (!event) return res.status(404).json({ message: "Event not found" });

    const applications = await Application.find({ eventId: req.params.eventId }).sort({ createdAt: -1 }).lean();
    const volunteerIds = applications.map((a) => a.volunteerId).filter(Boolean);
    const volunteerDocs = await User.find({ _id: { $in: volunteerIds } })
      .select("name email city interests")
      .lean();

    const byVolunteerId = Object.fromEntries(volunteerDocs.map((v) => [String(v._id), v]));

    const enriched = applications.map((app) => ({
      ...app,
      volunteerProfile: byVolunteerId[String(app.volunteerId)] || null,
    }));

    res.json({ event, applications: enriched });
  } catch (error) {
    next(error);
  }
});

router.patch("/events/:eventId/confirm-attendance", async (req, res, next) => {
  try {
    const { volunteerId, confirmed } = req.body;
    if (!volunteerId || confirmed !== true) {
      return res.status(400).json({ message: "volunteerId and confirmed: true are required" });
    }

    const event = await Event.findOne(organizerEventQuery(req.organizer._id, { _id: req.params.eventId }));
    if (!event) return res.status(404).json({ message: "Event not found" });

    const outcome = await confirmAttendanceByOrganizer(event, volunteerId);
    const attendedCount = await Application.countDocuments({ eventId: event._id, attended: true });

    res.json({
      success: true,
      attendedCount,
      alreadyConfirmed: outcome.alreadyConfirmed,
      volunteerPoints: outcome.user?.points,
      volunteerBadges: outcome.user?.badges,
      attendedEvents: outcome.user?.attendedEvents,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
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

    const event = await Event.findOne(organizerEventQuery(req.organizer._id, { _id: application.eventId }));
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

    const event = await Event.findOne(organizerEventQuery(req.organizer._id, { _id: application.eventId }));
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
    const events = await Event.find(organizerEventQuery(req.organizer._id));
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
