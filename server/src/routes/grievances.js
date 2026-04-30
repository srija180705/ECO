const express = require("express");
const { auth, adminAuth } = require("../middleware/auth");
const Grievance = require("../models/Grievance");
const User = require("../models/User");

const router = express.Router();

router.post("/", auth, async (req, res, next) => {
  try {
    const { eventName, organizationName, description } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const grievance = await Grievance.create({
      userEmail: user.email,
      eventName,
      organizationName,
      description,
      status: "open",
      createdBy: user._id
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
    res.json(grievance);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
