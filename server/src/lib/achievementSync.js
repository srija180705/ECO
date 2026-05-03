const mongoose = require("mongoose");
const User = require("../models/User");
const Reward = require("../models/Reward");
const Notification = require("../models/Notification");

async function syncAchievementBadges(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const user = await User.findById(userId);
  if (!user) return null;

  const defs = await Reward.find({ badgeId: { $exists: true, $ne: "" } });
  const badgeSet = new Set(user.badges || []);
  const eventCount = (user.attendedEvents || []).length;
  const points = Number(user.points) || 0;
  let changed = false;
  /** @type {{ badgeId: string, title: string, description: string }[]} */
  const newlyEarned = [];

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
      newlyEarned.push({
        badgeId: def.badgeId,
        title: def.title || def.badgeId,
        description: def.description || "",
      });
    }
  }

  if (changed) {
    user.badges = [...badgeSet];
    await user.save();
    for (const b of newlyEarned) {
      try {
        await Notification.create({
          userId: user._id,
          type: "badge_earned",
          title: `New badge: ${b.title}`,
          body:
            b.description && String(b.description).trim()
              ? String(b.description).trim()
              : `You earned the "${b.title}" badge.`,
          meta: { badgeId: b.badgeId },
        });
      } catch (e) {
        console.error("[notifications] badge_earned:", e.message);
      }
    }
  }
  return user;
}

module.exports = { syncAchievementBadges };
