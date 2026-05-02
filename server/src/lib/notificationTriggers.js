const Notification = require("../models/Notification");
const User = require("../models/User");

const BATCH = 250;

async function notifyVolunteersNewEvent(event) {
  const title = event.title || "New event";
  const eventId = String(event._id);
  const organizerId = event.createdBy ? String(event.createdBy) : null;

  const query = { role: { $in: ["volunteer", "user"] } };
  if (organizerId) {
    query._id = { $ne: event.createdBy };
  }

  const cursor = User.find(query).select("_id").cursor();
  const batch = [];

  async function flush() {
    if (batch.length === 0) return;
    const docs = batch.splice(0, batch.length).map((u) => ({
      userId: u._id,
      type: "new_event",
      title: "New volunteering opportunity",
      body: `${title} is live — open your dashboard to browse and join.`,
      read: false,
      meta: { eventId },
    }));
    await Notification.insertMany(docs);
  }

  for await (const u of cursor) {
    batch.push(u);
    if (batch.length >= BATCH) await flush();
  }
  await flush();
}

async function notifyOrganizerVolunteerJoined(event, volunteer) {
  const organizerId = event.organizerId || event.createdBy;
  if (!organizerId || !volunteer?._id) return;
  if (String(organizerId) === String(volunteer._id)) return;

  const title = event.title || "Your event";
  const name = volunteer.name || "A volunteer";
  await Notification.create({
    userId: organizerId,
    type: "volunteer_joined_event",
    title: "Volunteer joined your event",
    body: `${name} registered for "${title}".`,
    read: false,
    meta: {
      eventId: String(event._id),
      volunteerId: String(volunteer._id),
    },
  });
}

async function notifyOrganizerEventApproved(event) {
  if (!event.createdBy) return;
  const title = event.title || "Your event";
  await Notification.create({
    userId: event.createdBy,
    type: "event_approved",
    title: "Event approved by admin",
    body: `"${title}" is approved and visible to volunteers.`,
    read: false,
    meta: { eventId: String(event._id) },
  });
}

function snippet(text, max = 220) {
  if (!text || typeof text !== "string") return "";
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

async function notifyUserComplaintReply(grievance, adminResponseText) {
  if (!grievance.createdBy || !adminResponseText) return;
  const ref = grievance.referenceId ? ` (${grievance.referenceId})` : "";
  await Notification.create({
    userId: grievance.createdBy,
    type: "complaint_reply",
    title: `Admin replied to your complaint${ref}`,
    body: snippet(adminResponseText, 280),
    read: false,
    meta: {
      grievanceId: String(grievance._id),
      referenceId: grievance.referenceId || "",
    },
  });
}

async function notifyUserComplaintResolved(grievance) {
  if (!grievance.createdBy) return;
  const ref = grievance.referenceId ? ` ${grievance.referenceId}` : "";
  await Notification.create({
    userId: grievance.createdBy,
    type: "complaint_resolved",
    title: "Complaint marked resolved",
    body: grievance.adminResponse
      ? `See the admin message on your Complaints page${ref ? ` (${ref.trim()})` : ""}.`
      : `Your grievance was closed${ref ? ` (${ref.trim()})` : ""}.`,
    read: false,
    meta: {
      grievanceId: String(grievance._id),
      referenceId: grievance.referenceId || "",
    },
  });
}

module.exports = {
  notifyVolunteersNewEvent,
  notifyOrganizerEventApproved,
  notifyOrganizerVolunteerJoined,
  notifyUserComplaintReply,
  notifyUserComplaintResolved,
};
