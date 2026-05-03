const express = require("express");
const { auth } = require("../middleware/auth");
const Notification = require("../models/Notification");

const router = express.Router();

router.get("/", auth, async (req, res, next) => {
  try {
    const items = await Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: req.user.userId,
      read: false,
    });

    res.json({ items, unreadCount });
  } catch (err) {
    next(err);
  }
});

router.patch("/read-all", auth, async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.userId, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/read", auth, async (req, res, next) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { read: true } },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: "Notification not found" });
    res.json({ success: true, notification: n });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
