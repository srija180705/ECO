# Troubleshooting Guide

## Issue 1: Email Not Arriving

### What's Happening Now
- When you click "Join Event", the button shows "✅ Joined" 
- A success message displays on screen
- Server logs the email intent to console
- **But no actual email is sent**

### Why?
Email sending requires SMTP credentials. The app is currently in "demo mode" where it logs what would happen.

### To Fix It
1. Configure real email in `server/.env` - see [EMAIL_SETUP.md](./EMAIL_SETUP.md)
2. Restart the backend server
3. Try joining an event again
4. Check your email inbox

### Temporary Workaround
Check the server console output when you join an event:
```
[EMAIL] Email would be sent to user@example.com:
Title: Event Name
Address: Full address here
```

---

## Issue 2: Map Location Not Showing

### What's Happening Now
- Click on event address in Dashboard → Map page opens
- Map shows India by default
- Shows message like "Using city-level location (geocoding error)"
- No address marker appears on map

### Why?
The app tries to find exact coordinates using OpenStreetMap's Nominatim geocoder, which sometimes times out or is rate-limited.

### Improvements Made
- ✅ Fallback to city-level coordinates (e.g., "Hyderabad" → city center)
- ✅ Automatically zooms to level 13 when event is selected
- ✅ Shows fallback location status
- ✅ 3-second timeout to prevent hanging

### To Fully Fix It
Make sure event addresses include recognized city names:
- ✅ Good: "123 Green Street, Hyderabad, Telangana"
- ✅ Good: "Near Charminar, Hyderabad"
- ❌ Avoid: "Location near XYZ" (without city name)

### Current Fallback Locations (Auto-Detected)
```
Mumbai, Bengaluru, Kolkata, Hyderabad, New Delhi,
Chennai, Varanasi, Pune, Ooty, Jaipur, Ahmedabad, Kochi
```

If your event is in one of these cities, the map will show the city center even if exact address resolution fails.

---

## Testing Checklist

- [ ] Create an event with a recognized city name
- [ ] Join the event
- [ ] Look for success feedback on Dashboard
- [ ] Click the event address
- [ ] Verify map shows the city location (zoomed in)
- [ ] Check server console for email logs
- [ ] (Optional) Configure SMTP to receive real emails

---

## Common Errors

### "Unable to get your location"
This is the user's browser location access, not the event location. It's expected if:
- Browser location permission not granted
- Device doesn't have GPS
- Location services disabled

**This does NOT affect event address display.**

### "Using city-level location (geocoding error)"
Normal fallback behavior when exact address can't be resolved. The map will still show the city center.

### No email received
Without SMTP configured, no email is sent. Check `server/.env` is filled in correctly.
