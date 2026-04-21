const express = require("express");
const { auth } = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// Get all users
router.get("/", async (req, res, next) => {
  try {
    const users = await User.find().select("-passwordHash");
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get("/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.patch("/:id", auth, async (req, res, next) => {
  try {
    if (req.user.userId !== req.params.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { name, city, interests, points, joinedEvents, attendedEvents } = req.body;
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (city !== undefined) patch.city = city;
    if (interests !== undefined) patch.interests = interests;
    if (joinedEvents !== undefined) patch.joinedEvents = joinedEvents;
    if (attendedEvents !== undefined) patch.attendedEvents = attendedEvents;
    if (points !== undefined) {
      const p = Number(points);
      if (Number.isFinite(p) && p >= 0) patch.points = Math.floor(p);
    }
    const user = await User.findByIdAndUpdate(req.params.id, patch, { new: true }).select("-passwordHash");

    res.json(user);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
