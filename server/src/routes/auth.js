const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { adminAuth } = require("../middleware/auth");

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

async function sendMail(to, subject, html, text) {
  const nodemailer = require("nodemailer");
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || smtpUser || 'no-reply@example.com';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`[EMAIL] SMTP not configured. Would send mail to ${to}: ${subject}`);
    return { sent: false };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: emailFrom,
    to,
    subject,
    text,
    html,
  });

  return { sent: true, info };
}

async function notifyAdmins(subject, message) {
  const admins = await User.find({ role: 'admin' });
  if (!admins.length) {
    console.log('[EMAIL] No admin user found to notify');
    return;
  }

  const recipientList = admins.map((admin) => admin.email).join(', ');
  await sendMail(recipientList, subject, `<p>${message}</p>`, message);
}

async function notifyOrganizer(user, subject, message) {
  await sendMail(user.email, subject, `<p>${message}</p>`, message);
}

router.post("/register", upload.single('permissionSlip'), async (req, res, next) => {
  try {
    const { name, email, password, city, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email/password required" });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const normalizedRole = role === "organizer" ? "organizer" : "volunteer";
    const isOrganizerRequest = normalizedRole === "organizer";

    if (isOrganizerRequest && !req.file) {
      return res.status(400).json({ message: 'Organizer registration requires a permission slip upload.' });
    }

    const permissionSlipUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name || "Volunteer",
      email: email.toLowerCase(),
      passwordHash,
      role: normalizedRole,
      city: city || "Hyderabad",
      points: 0,
      badges: ["b1"],
      interests: [],
      isVerified: isOrganizerRequest ? false : true,
      permissionSlipUrl
    });

    if (isOrganizerRequest) {
      await notifyAdmins(
        'New organizer approval request',
        `A new organizer has registered with name ${user.name} and email ${user.email}. Please review their request and approve the account before they can sign in as an organizer.`
      );
      return res.status(201).json({
        message: 'Your organizer request has been submitted. Admin approval is required before you can log in.',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: 'organizer',
          city: user.city,
          isVerified: false,
          permissionSlipUrl: user.permissionSlipUrl
        }
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ 
      token, 
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role === "user" ? "volunteer" : user.role,
        city: user.city,
        isVerified: true
      } 
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email/password required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    if (user.role === 'organizer' && user.isVerified === false) {
      return res.status(403).json({ message: 'Organizer account pending admin approval. Please wait for approval before logging in.' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ 
      token, 
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role === "user" ? "volunteer" : user.role,
        city: user.city,
        isVerified: user.isVerified
      } 
    });
  } catch (error) {
    next(error);
  }
});

router.post('/organizer/permission-slip', upload.single('permissionSlip'), async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authorization required' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'organizer') return res.status(403).json({ message: 'Only organizer accounts can upload permission slips' });

    if (!req.file) return res.status(400).json({ message: 'Permission slip file is required' });

    user.permissionSlipUrl = `/uploads/${req.file.filename}`;
    user.isVerified = false;
    await user.save();

    await notifyAdmins(
      'Organizer permission slip received',
      `Organizer ${user.name} (${user.email}) has uploaded a permission slip. Review the document and approve the account when ready.`
    );

    res.json({ message: 'Permission slip submitted. Admin will review your request.', permissionSlipUrl: user.permissionSlipUrl });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/organizers/pending', adminAuth, async (req, res, next) => {
  try {
    const pendingOrganizers = await User.find({ role: 'organizer', isVerified: false }).select('-passwordHash');
    res.json(pendingOrganizers);
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/organizers/:userId/verify', adminAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.userId, role: 'organizer' });
    if (!user) return res.status(404).json({ message: 'Organizer not found' });

    user.isVerified = true;
    await user.save();

    await notifyOrganizer(
      user,
      'Organizer account approved',
      `Your organizer account has been approved by the admin. You can now log in and create events.`
    );

    res.json({ message: 'Organizer approved successfully', user: { _id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified } });
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/organizers/:userId', adminAuth, async (req, res, next) => {
  try {
    const user = await User.findOneAndDelete({
      _id: req.params.userId,
      role: 'organizer',
      isVerified: false
    });
    if (!user) return res.status(404).json({ message: 'Pending organizer not found' });

    await notifyOrganizer(
      user,
      'Organizer account declined',
      'Your organizer account request was declined by the admin. You may register again with updated permission details.'
    );

    res.json({ message: 'Organizer request declined successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
