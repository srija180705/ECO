const Application = require("../models/Application");
const User = require("../models/User");
const { syncAchievementBadges } = require("./achievementSync");

/**
 * Organizer confirms a volunteer attended an event: updates Application, user points & badges.
 */
async function confirmAttendanceByOrganizer(event, volunteerId) {
  const application = await Application.findOne({ eventId: event._id, volunteerId });
  if (!application) {
    const err = new Error("Volunteer has not joined this event");
    err.status = 404;
    throw err;
  }
  if (application.status === "withdrawn" || application.status === "rejected") {
    const err = new Error("This registration is not eligible for attendance confirmation");
    err.status = 400;
    throw err;
  }

  if (application.attended) {
    const fresh = await User.findById(volunteerId).select("points attendedEvents badges");
    return { alreadyConfirmed: true, user: fresh };
  }

  application.attended = true;
  await application.save();

  const user = await User.findById(volunteerId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  const pointsToAdd = Number(event.points) || 0;
  const eventIdStr = String(event._id);
  if (!user.attendedEvents.some((id) => String(id) === eventIdStr)) {
    user.attendedEvents.push(eventIdStr);
    user.points = Number(user.points || 0) + pointsToAdd;
    await user.save();
    await syncAchievementBadges(user._id);
  }

  const fresh = await User.findById(volunteerId).select("points attendedEvents badges");
  return { alreadyConfirmed: false, user: fresh };
}

module.exports = { confirmAttendanceByOrganizer };
