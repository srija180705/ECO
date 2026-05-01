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

const organizerUsers = [
  { name: "GreenTree Events", email: "organizer1@ecoapp.com", password: "Org12345" },
  { name: "CleanCity Organizers", email: "organizer2@ecoapp.com", password: "Org23456" }
];

const organizerEvents = [
  {
    title: "Lakeside Cleanup Drive",
    organizationName: "GreenTree Events",
    category: "cleanup",
    location: "Hussain Sagar Lake, Hyderabad",
    address: "Hussain Sagar Lakefront, Hyderabad, Telangana",
    description: "Volunteer to remove litter, plastic, and debris from the lake shore.",
    startDateISO: "2026-05-10",
    endDateISO: "2026-05-11",
    startHour: 9,
    endHour: 14,
    points: 45,
    distanceKm: 2.5,
    organizerIndex: 0
  },
  {
    title: "Botanical Garden Planting",
    organizationName: "GreenTree Events",
    category: "planting",
    location: "Osmania University Botanical Garden, Hyderabad",
    address: "Osmania University Botanical Garden, Hyderabad, Telangana",
    description: "Help plant native shrubs and flowers in the botanical garden.",
    startDateISO: "2026-05-13",
    endDateISO: "2026-05-13",
    startHour: 10,
    endHour: 16,
    points: 60,
    distanceKm: 3.0,
    organizerIndex: 0
  },
  {
    title: "Neighborhood Recycling Workshop",
    organizationName: "GreenTree Events",
    category: "recycling",
    location: "Kondapur Community Hall, Hyderabad",
    address: "Kondapur Community Hall, Hyderabad, Telangana",
    description: "Teach local families to separate waste and reuse materials.",
    startDateISO: "2026-05-14",
    endDateISO: "2026-05-14",
    startHour: 11,
    endHour: 15,
    points: 35,
    distanceKm: 4.1,
    organizerIndex: 0
  },
  {
    title: "City Park Tree Sapling Drive",
    organizationName: "GreenTree Events",
    category: "planting",
    location: "Kondapur Community Park, Hyderabad",
    address: "Kondapur Community Park, Hyderabad, Telangana",
    description: "Plant saplings and support native tree growth in the community park.",
    startDateISO: "2026-05-16",
    endDateISO: "2026-05-16",
    startHour: 8,
    endHour: 12,
    points: 50,
    distanceKm: 3.9,
    organizerIndex: 0
  },
  {
    title: "Plastic Audit & Awareness",
    organizationName: "GreenTree Events",
    category: "recycling",
    location: "Banjara Hills Community Center, Hyderabad",
    address: "Banjara Hills Community Center, Hyderabad, Telangana",
    description: "Audit local plastic waste and run a community awareness session.",
    startDateISO: "2026-05-18",
    endDateISO: "2026-05-18",
    startHour: 10,
    endHour: 14,
    points: 40,
    distanceKm: 5.2,
    organizerIndex: 0
  },
  {
    title: "Riverfront Conservation",
    organizationName: "CleanCity Organizers",
    category: "cleanup",
    location: "Musi Riverbank, Hyderabad",
    address: "Musi Riverbank Volunteer Point, Hyderabad, Telangana",
    description: "Clean the riverfront and remove plastic waste from the riverbank.",
    startDateISO: "2026-05-11",
    endDateISO: "2026-05-11",
    startHour: 9,
    endHour: 13,
    points: 55,
    distanceKm: 6.3,
    organizerIndex: 1
  },
  {
    title: "Community Garden Planting",
    organizationName: "CleanCity Organizers",
    category: "planting",
    location: "Barkatpura Community Garden, Hyderabad",
    address: "Barkatpura Community Garden, Hyderabad, Telangana",
    description: "Assist in planting herbs and seasonal flowers in the community garden.",
    startDateISO: "2026-05-15",
    endDateISO: "2026-05-15",
    startHour: 8,
    endHour: 13,
    points: 50,
    distanceKm: 3.1,
    organizerIndex: 1
  },
  {
    title: "Street Recycling Campaign",
    organizationName: "CleanCity Organizers",
    category: "recycling",
    location: "Secunderabad Clock Tower, Hyderabad",
    address: "Secunderabad Clock Tower, Hyderabad, Telangana",
    description: "Collect recyclable waste from local streets and educate residents.",
    startDateISO: "2026-05-17",
    endDateISO: "2026-05-17",
    startHour: 11,
    endHour: 15,
    points: 45,
    distanceKm: 2.8,
    organizerIndex: 1
  },
  {
    title: "Urban Greenbelt Planting",
    organizationName: "CleanCity Organizers",
    category: "planting",
    location: "Gachibowli Stadium Park, Hyderabad",
    address: "Gachibowli Stadium Park, Hyderabad, Telangana",
    description: "Plant trees along the greenbelt to improve air quality and shade.",
    startDateISO: "2026-05-19",
    endDateISO: "2026-05-19",
    startHour: 9,
    endHour: 14,
    points: 65,
    distanceKm: 12.0,
    organizerIndex: 1
  },
  {
    title: "Festival Cleanup Drive",
    organizationName: "CleanCity Organizers",
    category: "cleanup",
    location: "Charminar Pedestrian Zone, Hyderabad",
    address: "Charminar Pedestrian Zone, Hyderabad, Telangana",
    description: "Participate in a post-festival cleanup to restore the city center.",
    startDateISO: "2026-05-20",
    endDateISO: "2026-05-20",
    startHour: 8,
    endHour: 12,
    points: 60,
    distanceKm: 2.1,
    organizerIndex: 1
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
          badges: [],
          interests: []
        });
        console.log(`[SEED] Created admin user: ${admin.email}`);
      } else {
        console.log(`[SEED] Admin user already exists: ${admin.email}`);
      }
    }

    const organizerDocs = [];
    for (const organizer of organizerUsers) {
      const email = organizer.email.toLowerCase();
      let user = await User.findOne({ email });
      if (!user) {
        const passwordHash = await bcrypt.hash(organizer.password, 10);
        user = await User.create({
          name: organizer.name,
          email,
          passwordHash,
          role: "organizer",
          city: "Hyderabad",
          isVerified: true,
          points: 0,
          badges: [],
          interests: []
        });
        console.log(`[SEED] Created organizer user: ${email}`);
      } else {
        console.log(`[SEED] Organizer user already exists: ${email}`);
      }
      organizerDocs.push(user);
    }

    for (const event of organizerEvents) {
      const exists = await Event.findOne({ title: event.title, organizationName: event.organizationName });
      if (!exists) {
        const organizer = organizerDocs[event.organizerIndex];
        await Event.create({
          title: event.title,
          organizationName: event.organizationName,
          category: event.category,
          location: event.location,
          address: event.address,
          description: event.description,
          startDateISO: event.startDateISO,
          endDateISO: event.endDateISO,
          startHour: event.startHour,
          endHour: event.endHour,
          points: event.points,
          distanceKm: event.distanceKm,
          approved: true,
          status: "approved",
          isPublished: true,
          publishedAt: new Date(),
          createdBy: organizer._id,
          organizerId: organizer._id
        });
        console.log(`[SEED] Created organizer event: ${event.title}`);
      } else {
        console.log(`[SEED] Organizer event already exists: ${event.title}`);
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
