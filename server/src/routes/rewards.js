const express = require("express");
const mongoose = require("mongoose");
const Reward = require("../models/Reward");
const User = require("../models/User");

const router = express.Router();

const SEED_REWARDS = [
  { title: "Free Coffee", description: "One complimentary drink at a partner café.", pointsRequired: 50 },
  { title: "Eco Tote Bag", description: "Reusable bag made from recycled materials.", pointsRequired: 100 },
  { title: "Movie Ticket", description: "Single admission voucher at participating theaters.", pointsRequired: 150 },
  { title: "Water Bottle", description: "Stainless steel bottle from the Eco-Volunteer shop.", pointsRequired: 80 },
  { title: "T-shirt", description: "Limited edition volunteer tee.", pointsRequired: 120 },
  { title: "Gift Card", description: "$10 gift card from a local green business.", pointsRequired: 200 },
];

router.post("/redeem", async (req, res, next) => {
  try {
    const { userId, rewardId } = req.body;
    if (!userId || !rewardId) {
      return res.status(400).json({ message: "userId and rewardId are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(rewardId)) {
      return res.status(400).json({ message: "Invalid userId or rewardId" });
    }

    const reward = await Reward.findById(rewardId);
    if (!reward) return res.status(404).json({ message: "Reward not found" });

    const updated = await User.findOneAndUpdate(
      { _id: userId, points: { $gte: reward.pointsRequired } },
      { $inc: { points: -reward.pointsRequired } },
      { new: true }
    ).select("points");

    if (!updated) {
      const user = await User.findById(userId).select("_id");
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.status(400).json({ message: "Not enough points" });
    }

    res.json({ points: updated.points, message: "Redeemed successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/seed", async (req, res, next) => {
  try {
    let inserted = 0;
    for (const item of SEED_REWARDS) {
      const result = await Reward.updateOne(
        { title: item.title },
        { $setOnInsert: { title: item.title, description: item.description, pointsRequired: item.pointsRequired } },
        { upsert: true }
      );
      if (result.upsertedCount === 1) inserted += 1;
    }
    const rewards = await Reward.find().sort({ pointsRequired: 1 });
    res.json({
      message: "Seed complete",
      inserted,
      skipped: SEED_REWARDS.length - inserted,
      totalInDb: rewards.length,
      rewards,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const rewards = await Reward.find().sort({ pointsRequired: 1 });
    res.json(rewards);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, description, pointsRequired } = req.body;
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }
    const points = Number(pointsRequired);
    if (!Number.isFinite(points) || points < 0) {
      return res.status(400).json({ message: "pointsRequired must be a non-negative number" });
    }
    const reward = await Reward.create({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      pointsRequired: points,
    });
    res.status(201).json(reward);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
