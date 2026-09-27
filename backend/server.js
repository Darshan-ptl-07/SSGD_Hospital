const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Data directory and files
const DATA_DIR = path.join(__dirname, 'data');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they do not exist
if (!fs.existsSync(APPOINTMENTS_FILE)) {
  fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify([], null, 2));
}

function getAdminPassword() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (data && data.adminPassword) return data.adminPassword;
    }
  } catch (e) {
    // fallback
  }
  return process.env.ADMIN_PASSWORD || 'admin123';
}

function setAdminPassword(newPassword) {
  const settings = { adminPassword: newPassword, updatedAt: new Date().toISOString() };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function readAppointments() {
  try {
    const raw = fs.readFileSync(APPOINTMENTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeAppointments(data) {
  fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify(data, null, 2));
}

// CORS setup
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5500',
  'http://localhost:8000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:8000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow server-to-server or no-origin requests
    if (!origin) return callback(null, true);
    // Allow matching origins or any vercel.app preview/production deployment
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    // Permissive fallback
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// 1. Health check endpoint (for Render keep-alive & monitoring)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Admin Authentication
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const currentPassword = getAdminPassword();

  if (password && password === currentPassword) {
    return res.json({
      success: true,
      token: 'admin-' + Buffer.from(Date.now().toString()).toString('base64'),
      message: 'Authentication successful'
    });
  }
  return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
});

// 3. Admin Change Password
app.post('/api/auth/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const existingPassword = getAdminPassword();

  if (currentPassword !== existingPassword) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, message: 'New password must be at least 4 characters.' });
  }

  setAdminPassword(newPassword.trim());
  return res.json({ success: true, message: 'Password updated successfully.' });
});

// 4. Get all appointments (Admin)
app.get('/api/appointments', (req, res) => {
  const appointments = readAppointments();
  res.json({ success: true, appointments });
});

// 5. Submit new appointment (Public website form)
app.post('/api/appointments', (req, res) => {
  const { name, phone, department, date, message } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required.' });
  }

  const appointments = readAppointments();
  const newBooking = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: name.trim(),
    phone: phone.trim(),
    department: department ? department.trim() : 'General',
    date: date || '',
    message: message ? message.trim() : '',
    status: 'pending',
    bookedAt: new Date().toISOString()
  };

  appointments.unshift(newBooking);
  writeAppointments(appointments);

  res.status(201).json({
    success: true,
    message: 'Appointment submitted successfully',
    appointment: newBooking
  });
});

// 6. Update appointment status (Yes = confirmed, No = rejected)
app.patch('/api/appointments/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['confirmed', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value.' });
  }

  const appointments = readAppointments();
  const booking = appointments.find((item) => item.id === id);

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Appointment not found.' });
  }

  booking.status = status;
  writeAppointments(appointments);

  res.json({ success: true, appointment: booking });
});

// 7. Clear all appointments
app.delete('/api/appointments', (req, res) => {
  writeAppointments([]);
  res.json({ success: true, message: 'All appointments cleared successfully.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Hospital Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
