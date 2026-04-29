const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, city, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email/password required" });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const normalizedRole = role === "organizer" ? "organizer" : "volunteer";

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name || "Volunteer",
      email: email.toLowerCase(),
      passwordHash,
      role: normalizedRole,
      city: city || "Hyderabad",
      points: 0,
      badges: ["b1"],
      interests: []
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ 
      token, 
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role === "user" ? "volunteer" : user.role,
        city: user.city
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

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ 
      token, 
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role === "user" ? "volunteer" : user.role,
        city: user.city
      } 
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
