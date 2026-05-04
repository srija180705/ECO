# Eco Volunteer Match

A full-stack web application for connecting volunteers with environmental projects.

## 🌐 Live Deployment

**[https://eco-five-gold.vercel.app](https://eco-five-gold.vercel.app)**

> The frontend is deployed on Vercel. Note: The live deployment connects to the hosted backend. For full local development (including backend), follow the Quick Start guide below.

---

## 🚀 Quick Start (Local Development — 2 Terminals)

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

## 🏗️ Architecture

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Auth**: JWT (7-day expiry) + bcrypt password hashing
- **Deployment**: Vercel (frontend)

---

## 📝 Notes

- Default city: "Hyderabad"
- Initial points: 0 (for rewards system)
- Initial badge: "b1" (for gamification)
- Tokens expire after 7 days
- Passwords are hashed with bcrypt (10 rounds)
