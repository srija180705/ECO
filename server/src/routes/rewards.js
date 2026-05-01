const express = require("express");
const mongoose = require("mongoose");
const Reward = require("../models/Reward");
const User = require("../models/User");
const { syncAchievementBadges } = require("../lib/achievementSync");
const { SEED_ACHIEVEMENTS } = require("../lib/achievementDefinitions");

const router = express.Router();

async function purgeLegacyRewards() {
  await Reward.deleteMany({
    $or: [{ badgeId: { $exists: false } }, { badgeId: null }, { badgeId: "" }],
  });
}

async function upsertAchievementSeeds(items) {
  let inserted = 0;
  for (const item of items) {
    const result = await Reward.updateOne(
      { badgeId: item.badgeId },
      {
        $set: {
          title: item.title,
          description: item.description,
          kind: item.kind,
          threshold: item.threshold,
          iconEmoji: item.iconEmoji || "🏅",
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount === 1) inserted += 1;
  }
  return inserted;
}

function enrichAchievement(defDoc, user) {
  const def = defDoc.toObject ? defDoc.toObject() : defDoc;
  const eventCount = (user.attendedEvents || []).length;
  const points = Number(user.points) || 0;
  const threshold = Number(def.threshold || 0);
  let progressCurrent = 0;
  let eligible = false;
  if (def.kind === "events") {
    progressCurrent = Math.min(eventCount, threshold);
    eligible = eventCount >= threshold;
  } else {
    progressCurrent = Math.min(points, threshold);
    eligible = points >= threshold;
  }
  const badges = user.badges || [];
  const unlocked = badges.includes(def.badgeId);
  return {
    ...def,
    unlocked,
    eligible,
    progressCurrent,
    progressTarget: threshold,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const defs = await Reward.find().sort({ kind: 1, threshold: 1 });
    const userId = req.query.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      const achievements = defs.map((d) => ({
        ...(d.toObject ? d.toObject() : d),
        unlocked: false,
        eligible: false,
        progressCurrent: 0,
        progressTarget: d.threshold,
      }));
      return res.json({ achievements, userBadges: [] });
    }

    await syncAchievementBadges(userId);
    const user = await User.findById(userId).select("points attendedEvents badges");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const achievements = defs.map((d) => enrichAchievement(d, user));
    res.json({
      achievements,
      userBadges: user.badges || [],
    });
  } catch (error) {
    next(error);
  }
});

router.post("/seed", async (req, res, next) => {
  try {
    await purgeLegacyRewards();
    const inserted = await upsertAchievementSeeds(SEED_ACHIEVEMENTS);
    const achievements = await Reward.find().sort({ kind: 1, threshold: 1 });
    res.json({
      message: "Achievement seed complete",
      inserted,
      totalInDb: achievements.length,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.upsertAchievementSeeds = upsertAchievementSeeds;
module.exports.purgeLegacyRewards = purgeLegacyRewards;
