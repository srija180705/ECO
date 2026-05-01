# Eco Volunteer Match - Demo App

A full-stack demonstration of the Eco Volunteer Match application with integrated frontend and backend authentication.


## 🚀 Quick Start (2 Terminals)

### Prerequisites
- **Node.js** v18+ installed
- **MongoDB** running locally (default: `mongodb://localhost:27017`)

### Terminal 1: Backend Setup

```bash
cd server
npm install
npm start
```

Expected output:
```
[DB] Connected
[API] running on http://localhost:4000
```

### Terminal 2: Frontend Setup

```bash
npm install
npm run dev
```

The app will open automatically at `http://localhost:5173`

> Local dev uses Vite proxy for `/api` requests, so the frontend does not need `VITE_API_BASE` while running on `http://localhost:5173`.
> For production builds using a separate backend host, set `VITE_API_BASE` in the frontend environment to the backend base URL.

---

## ✨ Features

### Frontend
- **Splash Screen** → Auto-navigates to login after 2.2s
- **Login Page** → Authenticate existing users
- **Register Page** → Create new user accounts
- **Responsive Design** → Mobile, tablet, desktop compatible
- **Error Handling** → Shows validation & server errors
- **Token Storage** → JWT tokens saved to localStorage

### Backend
- **User Registration** → Create new volunteer accounts
- **User Login** → Authenticate with email/password
- **Password Security** → bcrypt hashing
- **JWT Tokens** → 7-day token expiration
- **MongoDB Storage** → All registrations persisted
- **CORS Enabled** → Frontend-backend communication

---

## 📊 Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  name: String,           // "John Doe"
  email: String,          // "john@example.com" (unique)
  passwordHash: String,   // bcrypt hashed password
  city: String,           // "Hyderabad"
  points: Number,         // 0 (for rewards)
  badges: [String],       // ["b1"]
  interests: [String],    // ["environmental", "wildlife"]
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 API Endpoints

### Authentication
- **POST** `/api/auth/register` - Create new account
  ```json
  Request: { "name": "John", "email": "john@example.com", "password": "secret123" }
  Response: { "token": "jwt_token", "user": { "_id": "...", "name": "John", "email": "john@example.com" } }
  ```

- **POST** `/api/auth/login` - Login existing user
  ```json
  Request: { "email": "john@example.com", "password": "secret123" }
  Response: { "token": "jwt_token", "user": { "_id": "...", "name": "John", "email": "john@example.com" } }
  ```

### Users
- **GET** `/api/users/me` - Get current user profile (requires auth)
- **GET** `/api/users` - Get all users
- **PATCH** `/api/users/:id` - Update user profile (requires auth)

---

## 🧪 Testing the App

### Test Account
After registering, you can login with the same credentials.

### Example Flow
1. **Load app** → Splash screen appears
2. **Wait 2.2s** → Auto-navigates to /auth
3. **Click Register tab** → See name, email, password fields
4. **Enter details:**
   - Name: `John Doe`
   - Email: `john@example.com`
   - Password: `password123`
5. **Click "Create Account"** → Backend registers user in MongoDB
6. **Success message** → "Welcome John Doe!"
7. **Login** → Switch to login tab and use same credentials

---

## 🛠️ Environment Variables

**server/.env**
```
MONGODB_URI=mongodb://localhost:27017/eco-volunteer
JWT_SECRET=your-secret-key-change-in-production
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

---

## ⚙️ Development Commands

**Frontend:**
```bash
npm run dev      # Start dev server on port 5173
npm run build    # Build for production
npm run preview  # Preview production build
```

**Backend:**
```bash
npm run dev      # Start with hot-reload (requires nodemon)
npm start        # Start production server
npm run seed     # Seed database with sample data (if available)
```

---

## 🐛 Troubleshooting

### Backend Connection Issues
- **MongoDB not running?** Start MongoDB:
  ```bash
  mongod
  ```
- **Port 4000 already in use?** Change in `server/.env`: `PORT=5000`

### Frontend Can't Reach Backend?
- Check CORS: `CLIENT_ORIGIN=http://localhost:5173` in `.env`
- Check API URL: Should be `http://localhost:4000`
- Browser console: Press F12 → Network tab to see requests

### Registration Not Saving?
- Check backend is running: `npm start` in server folder
- Check MongoDB connection: Look for `[DB] Connected` message
- Check database: `mongosh` → `use eco-volunteer` → `db.users.find()`

---

## 📱 Demo Presentation Script (3 minutes)

**Slide 1: Intro**
"This is Eco Volunteer Match - a full-stack web application for connecting volunteers with environmental projects."

**Slide 2: Show Splash**
"When users first open the app, they see our branded splash screen with a loading animation."

**Slide 3: Show Login/Register**
"After 2 seconds, they're taken to our authentication page. They can register as a new volunteer or login if they already have an account."

**Slide 4: Demo Register**
1. Click "Register" tab
2. Fill: Name, Email, Password
3. Click "Create Account"
4. Point out: "Their account is now saved in our MongoDB database"

**Slide 5: Demo Login**
1. Click "Login" tab
2. Use same email/password
3. Click "Login"
4. Show: "Authentication successful!"

**Slide 6: Architecture**
"The frontend is React with Vite, the backend is Node.js/Express, and data is stored in MongoDB. Everything is connected and working."

---

## 📚 Next Steps (For Teacher)

This demo shows:
✅ Frontend UI (Splash + Auth)
✅ Backend API (Register/Login)
✅ Database Persistence (MongoDB)
✅ JWT Authentication
✅ Responsive Design

To extend:
- Add Dashboard page
- Add Event listing
- Add Volunteer matching algorithm
- Add Rewards system
- Deploy to cloud (Azure/AWS)

---

## 📝 Notes

- Default city: "Hyderabad" (can be changed in profile)
- Initial points: 0 (for rewards system)
- Initial badge: "b1" (for gamification)
- Tokens expire after 7 days
- Passwords are hashed with bcrypt (10 rounds)

---

**Created for teacher demo - February 2026**
