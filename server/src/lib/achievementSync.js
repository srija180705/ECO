const mongoose = require("mongoose");
const User = require("../models/User");
const Reward = require("../models/Reward");

async function syncAchievementBadges(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const user = await User.findById(userId);
  if (!user) return null;

  const defs = await Reward.find({ badgeId: { $exists: true, $ne: "" } });
  const badgeSet = new Set(user.badges || []);
  const eventCount = (user.attendedEvents || []).length;
  const points = Number(user.points) || 0;
  let changed = false;

  for (const def of defs) {
    if (!def.badgeId) continue;
    let met = false;
    if (def.kind === "events") {
      met = eventCount >= Number(def.threshold || 0);
    } else {
      met = points >= Number(def.threshold || 0);
    }
    if (met && !badgeSet.has(def.badgeId)) {
      badgeSet.add(def.badgeId);
      changed = true;
    }
  }

  if (changed) {
    user.badges = [...badgeSet];
    await user.save();
  }
  return user;
}

module.exports = { syncAchievementBadges };
