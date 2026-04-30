const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const { auth, adminAuth } = require("../middleware/auth");
const Event = require("../models/Event");
const User = require("../models/User");
const Application = require("../models/Application");

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER;

async function getMailTransport() {
  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }
  return null;
}

async function sendThankYouEmail(to, name, eventTitle, eventAddress) {
  try {
    console.log('[EMAIL] Attempting to send email to:', to);
    console.log('[EMAIL] SMTP Config - Host:', smtpHost, 'User:', smtpUser, 'Port:', smtpPort);
    
    const transport = await getMailTransport();
    if (!transport) {
      console.log(`[EMAIL] No SMTP configured. Email would be sent to ${to}:\nTitle: ${eventTitle}\nAddress: ${eventAddress}`);
      return {
        sent: false,
        previewUrl: null,
        note: '⚠️ Email sending is not configured. In production, it would send to: ' + to,
      };
    }

    console.log('[EMAIL] Transport created successfully');
    
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventAddress)}`;

    const mailOptions = {
      from: emailFrom || 'Eco Volunteer Match <no-reply@example.com>',
      to,
      subject: `🎉 Thank you for joining ${eventTitle}!`,
      text: `Hi ${name},\n\nThank you for joining ${eventTitle}.\n\nEvent address:\n${eventAddress}\n\nOpen in Google Maps: ${googleMapsUrl}\n\nSee you at the event!\n\nBest,\nEco-Volunteer Match Team`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
          <h2 style="color: #16a34a;">🎉 Thank you for joining ${eventTitle}!</h2>
          <p>Hi ${name},</p>
          <p>We are excited to confirm your participation in <strong>${eventTitle}</strong>.</p>
          <p><strong>Event address:</strong><br/>${eventAddress.replace(/\n/g, '<br/>')}</p>
          <p>
            <a href="${googleMapsUrl}" style="display: inline-block; padding: 12px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">
              📍 Open in Google Maps</a>
          </p>
          <p>See you there! 🥳</p>
          <p>Best,<br/>Eco-Volunteer Match Team</p>
        </div>
      `,
    };

    console.log('[EMAIL] Sending mail options to:', to);
    const info = await transport.sendMail(mailOptions);
    console.log(`[EMAIL] Email sent successfully to ${to}. Response:`, info.response);
    
    return {
      sent: true,
      previewUrl: nodemailer.getTestMessageUrl(info) || null,
    };
  } catch (emailError) {
    console.error('[EMAIL ERROR] Failed to send email to', to, ':', emailError.message);
    console.error('[EMAIL ERROR] Full error:', emailError);
    return {
      sent: false,
      error: emailError.message,
      previewUrl: null,
      note: `❌ Email delivery failed: ${emailError.message}`,
    };
  }
}

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

    const addressString = event.address || event.location || 'Address not available';
    const emailResult = await sendThankYouEmail(user.email, user.name, event.title, addressString);

    const responseMessage = `✅ Joined ${event.title} successfully. Thank-you email sent to ${user.email}.`;
    const payload = { message: responseMessage };
    if (emailResult.previewUrl) {
      payload.previewUrl = emailResult.previewUrl;
    }
    if (emailResult.error) {
      payload.emailWarning = `Note: There was an issue sending the email (${emailResult.error}), but your join was recorded.`;
    }

    res.json(payload);
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventEnd = event.endDateISO ? new Date(`${event.endDateISO}T23:59:59`) : null;
    if (!eventEnd || eventEnd >= today) {
      return res.status(400).json({ message: "Attendance can only be marked after the event has ended." });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const application = await Application.findOne({ eventId: event._id, volunteerId: user._id });
    if (!application) {
      return res.status(400).json({ message: "You must join this event before marking attendance." });
    }

    if (application.status !== "approved") {
      return res.status(400).json({ message: "Attendance can only be recorded for approved volunteers." });
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

    res.json({
      message: `Attendance recorded for ${event.title}.`,
      eventId: String(event._id),
      attended: true,
      points: user.points,
      attendedEvents: user.attendedEvents,
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
