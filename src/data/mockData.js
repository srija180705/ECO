export const mockDB = {
  users: [
    {
      id: "u1",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      city: "Hyderabad",
      points: 1520,
      badges: ["b1", "b2", "b3", "b4"],
      joinedEventIds: [],
      interests: ["cleanup", "planting", "recycling"],
    },
  ],
  events: [
    {
      id: "e1",
      title: "Hussain Sagar Cleanup Drive",
      category: "cleanup",
      points: 50,
      dateISO: "2026-05-08",
      location: "Hussain Sagar Lake, Hyderabad",
      distanceKm: 2.3,
      description:
        "Join a community cleanup to remove plastic and waste from the lakefront. Gloves and bags provided.",
    },
    {
      id: "e2",
      title: "KBR Park Tree Planting Initiative",
      category: "planting",
      points: 75,
      dateISO: "2026-05-09",
      location: "KBR National Park, Jubilee Hills, Hyderabad",
      distanceKm: 4.1,
      description:
        "Help plant native trees with local NGOs. Tools provided. Please wear comfortable footwear.",
    },
    {
      id: "e3",
      title: "Kondapur Recycling Workshop",
      category: "recycling",
      points: 35,
      dateISO: "2026-05-10",
      location: "Kondapur Community Hall, Hyderabad",
      distanceKm: 1.1,
      description:
        "Learn practical recycling tips and help neighbors set up a waste segregation plan.",
    },
    {
      id: "e4",
      title: "Lake Cleanup + Awareness",
      category: "cleanup",
      points: 60,
      dateISO: "2026-05-11",
      location: "Durgam Cheruvu, Madhapur, Hyderabad",
      distanceKm: 3.8,
      description:
        "Cleanup drive around the lake and a short awareness walk with posters.",
    },
    {
      id: "e5",
      title: "Community Garden Maintenance",
      category: "planting",
      points: 40,
      dateISO: "2026-05-12",
      location: "Botanical Garden, Kondapur, Hyderabad",
      distanceKm: 1.5,
      description:
        "Help maintain the local community garden by weeding, watering, and planting new seasonal flowers.",
    },
    {
      id: "e6",
      title: "E-Waste Collection Drive",
      category: "recycling",
      points: 80,
      dateISO: "2026-05-13",
      location: "Shilparamam, Hitec City, Hyderabad",
      distanceKm: 5.2,
      description:
        "Bring your old electronics for safe recycling. Volunteers needed to help sort and load e-waste.",
    },
    {
      id: "e7",
      title: "Urban Forest Expansion",
      category: "planting",
      points: 100,
      dateISO: "2026-05-14",
      location: "Gachibowli Stadium, Hyderabad",
      distanceKm: 12.0,
      description:
        "A major drive to plant 500 saplings to expand the city's green belt. Transport provided from city center.",
    },
    {
      id: "e8",
      title: "Riverbank Restoration",
      category: "cleanup",
      points: 65,
      dateISO: "2026-05-15",
      location: "Musi Riverfront, Nagole, Hyderabad",
      distanceKm: 6.4,
      description:
        "Critical cleanup of the riverbanks to remove accumulated debris before the monsoon season.",
    },
    {
      id: "e9",
      title: "Paper Recycling Workshop",
      category: "recycling",
      points: 30,
      dateISO: "2026-05-16",
      location: "Secunderabad Clock Tower, Hyderabad",
      distanceKm: 2.8,
      description:
        "Teach kids and families how to make recycled paper at home. Supplies provided.",
    },
    {
      id: "e10",
      title: "Medicinal Herb Planting",
      category: "planting",
      points: 45,
      dateISO: "2026-05-17",
      location: "Sanjeevaiah Park, Hyderabad",
      distanceKm: 8.1,
      description:
        "Assist botanists in planting a new section dedicated to native medicinal herbs.",
    },
    {
      id: "e11",
      title: "Plastic-Free Campus Campaign",
      category: "cleanup",
      points: 55,
      dateISO: "2026-05-18",
      location: "Osmania University, Hyderabad",
      distanceKm: 0.8,
      description:
        "Join student volunteers in picking up plastic waste and distributing reusable alternatives.",
    },
    {
      id: "e12",
      title: "Upcycling Art Session",
      category: "recycling",
      points: 50,
      dateISO: "2026-05-19",
      location: "NTR Gardens, Hyderabad",
      distanceKm: 3.5,
      description:
        "Turn discarded materials into art! Help coordinate the session and assist participants with their projects.",
    },
    {
      id: "e13",
      title: "Highway Median Greening",
      category: "planting",
      points: 90,
      dateISO: "2026-05-20",
      location: "Necklace Road, Hyderabad",
      distanceKm: 15.3,
      description:
        "Planting resilient shrubs along the highway median to reduce glare and absorb pollution. Safety vests required.",
    },
    {
      id: "e14",
      title: "Post-Festival Cleanup",
      category: "cleanup",
      points: 70,
      dateISO: "2026-05-21",
      location: "Charminar Pedestrian Zone, Hyderabad",
      distanceKm: 2.1,
      description:
        "Massive early morning cleanup effort following the annual city festival. Breakfast provided for volunteers.",
    }
  ],
  communityPosts: [
    {
      id: "p1",
      userId: "u1",
      content:
        "Just finished a cleanup drive today — amazing energy from everyone! 🌱",
      createdAtISO: "2026-02-10T10:30:00Z",
      likes: 12,
    },
    {
      id: "p2",
      userId: "u1",
      content:
        "Planting trees is so satisfying. We planted 20 saplings! 🏆",
      createdAtISO: "2026-02-11T08:15:00Z",
      likes: 7,
    },
  ],
  rewards: [
    { id: "r1", title: "Eco Bottle", cost: 300, description: "Reusable insulated bottle." },
    { id: "r2", title: "Plant a Tree (Donation)", cost: 500, description: "We sponsor a tree plantation." },
    { id: "r3", title: "Volunteer Hoodie", cost: 900, description: "Eco-Volunteer Match hoodie." },
  ],
  badges: [
    { id: "b1", title: "First Event", icon: "🏁" },
    { id: "b2", title: "Cleanup Hero", icon: "🧹" },
    { id: "b3", title: "Tree Planter", icon: "🌳" },
    { id: "b4", title: "Community Star", icon: "⭐" },
  ],
};
