const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const { auth, adminAuth } = require("../middleware/auth");
const Event = require("../models/Event");
const User = require("../models/User");

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

// Public endpoint for authenticated users: only approved events that have not closed
router.get("/", auth, async (req, res, next) => {
  try {
    const events = await Event.find({ approved: true, endDateISO: { $gte: todayISO() } }).sort({ startDateISO: 1 });
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
    const event = await Event.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!event) return res.status(404).json({ message: "Event not found" });
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

    if (!user.joinedEventIds.some((joinedId) => joinedId.equals(event._id))) {
      user.joinedEventIds.push(event._id);
      await user.save();
    }

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
