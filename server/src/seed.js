require("dotenv").config();
const bcrypt = require("bcrypt");
const { connectDB } = require("./db");
const User = require("./models/User");
const Event = require("./models/Event");
const Grievance = require("./models/Grievance");

const adminUsers = [
  { name: "Manasvi Lalitha", email: "lalithamanasvinisp@gmail.com", password: "ManasviSP#9" },
  { name: "Harika Puchalapalli", email: "harikapuchalapalli@gmail.com", password: "Harika123" },
  { name: "Ananya Pachwa", email: "anpachwa@gmail.com", password: "Ananya456" },
  { name: "Srija Polisetty", email: "Polisetty.srija123@gmail.com", password: "Srija789" },
  { name: "Sneha Suravajjula", email: "snehasuravajjula@gmail.com", password: "Sneha012" }
];

const sampleEvents = [
  {
    title: "Community Green Campus",
    organizationName: "Eco Campus Foundation",
    category: "cleanup",
    location: "Barkatpura, Hyderabad",
    address: "Barkatpura Community Ground, Hyderabad, Telangana",
    description: "Campus cleanup drive with student volunteers and local partners.",
    startDateISO: "2026-05-15",
    endDateISO: "2026-05-17",
    points: 60,
    distanceKm: 3.2,
    approved: false
  },
  {
    title: "Riverbank Conservation",
    organizationName: "RiverCare Org",
    category: "planting",
    location: "Godavari River, Rajahmundry",
    address: "Godavari Riverbank Volunteer Point, Rajahmundry, Andhra Pradesh",
    description: "Planting native saplings along the riverbank with local NGOs.",
    startDateISO: "2026-05-10",
    endDateISO: "2026-05-12",
    points: 80,
    distanceKm: 8.4,
    approved: true
  },
  {
    title: "Plastic Audit and Workshop",
    organizationName: "ReCycle India",
    category: "recycling",
    location: "Kondapur, Hyderabad",
    address: "Kondapur Community Hall, Hyderabad, Telangana",
    description: "Audit local waste with an education workshop for citizens.",
    startDateISO: "2026-04-10",
    endDateISO: "2026-04-12",
    points: 45,
    distanceKm: 4.7,
    approved: true
  }
];

const sampleGrievances = [
  {
    userEmail: "sarah@example.com",
    eventName: "Riverbank Conservation",
    organizationName: "RiverCare Org",
    description: "The event materials were not available as promised.",
    status: "open"
  },
  {
    userEmail: "manu@example.com",
    eventName: "Plastic Audit and Workshop",
    organizationName: "ReCycle India",
    description: "The workshop location was hard to find and signage was missing.",
    status: "open"
  }
];

async function seedDatabase() {
  try {
    await connectDB(process.env.MONGODB_URI);

    for (const admin of adminUsers) {
      const exists = await User.findOne({ email: admin.email.toLowerCase() });
      if (!exists) {
        const passwordHash = await bcrypt.hash(admin.password, 10);
        await User.create({
          name: admin.name,
          email: admin.email.toLowerCase(),
          passwordHash,
          role: "admin",
          city: "Hyderabad",
          points: 0,
          badges: ["b1"],
          interests: []
        });
        console.log(`[SEED] Created admin user: ${admin.email}`);
      } else {
        console.log(`[SEED] Admin user already exists: ${admin.email}`);
      }
    }

    for (const event of sampleEvents) {
      const exists = await Event.findOne({ title: event.title, organizationName: event.organizationName });
      if (!exists) {
        await Event.create(event);
        console.log(`[SEED] Created event: ${event.title}`);
      } else {
        console.log(`[SEED] Event already exists: ${event.title}`);
      }
    }

    for (const grievance of sampleGrievances) {
      const exists = await Grievance.findOne({ eventName: grievance.eventName, userEmail: grievance.userEmail });
      if (!exists) {
        await Grievance.create(grievance);
        console.log(`[SEED] Created grievance for: ${grievance.userEmail}`);
      } else {
        console.log(`[SEED] Grievance already exists for: ${grievance.userEmail}`);
      }
    }

    console.log("[SEED] Database seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("[SEED] Error:", error);
    process.exit(1);
  }
}

seedDatabase();
