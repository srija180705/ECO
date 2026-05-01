/** Badges unlocked by volunteer points or number of attended events (no purchases). */
const SEED_ACHIEVEMENTS = [
  {
    badgeId: "first-green-step",
    title: "First green step",
    description: "Complete your first attended volunteering event.",
    kind: "events",
    threshold: 1,
    iconEmoji: "🌱",
  },
  {
    badgeId: "eco-regular",
    title: "Eco regular",
    description: "Attend 5 events.",
    kind: "events",
    threshold: 5,
    iconEmoji: "🌿",
  },
  {
    badgeId: "planet-veteran",
    title: "Planet veteran",
    description: "Attend 10 recorded events—a milestone badge.",
    kind: "events",
    threshold: 10,
    iconEmoji: "🌍",
  },
  {
    badgeId: "points-starter",
    title: "Points starter",
    description: "Reach 50 lifetime volunteer points.",
    kind: "points",
    threshold: 50,
    iconEmoji: "⭐",
  },
  {
    badgeId: "points-runner",
    title: "Points runner",
    description: "Reach 150 lifetime volunteer points.",
    kind: "points",
    threshold: 150,
    iconEmoji: "🏃",
  },
  {
    badgeId: "points-finisher",
    title: "Points finisher",
    description: "Reach 300 lifetime volunteer points.",
    kind: "points",
    threshold: 300,
    iconEmoji: "🏆",
  },
];

module.exports = { SEED_ACHIEVEMENTS };
