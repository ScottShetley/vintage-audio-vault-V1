// server/app.js
require ('dotenv').config ({path: '../.env'}); // Load environment variables from the root .env file

// It's good practice to import all necessary modules at the top
const express = require ('express');
const mongoose = require ('mongoose');
const authRoutes = require ('./routes/authRoutes'); // Import authentication routes
const audioItemRoutes = require ('./routes/audioItemRoutes'); // Import audio item routes

const app = express ();
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000

app.use (express.json ());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  mongoose
    .connect (MONGODB_URI)
    .then (() => console.log ('MongoDB connected successfully!'))
    .catch (err => {
      console.error ('MongoDB connection error:', err);
      // Optionally, exit the process if DB connection is critical
      // process.exit(1);
    });
} else {
  console.warn (
    'MONGODB_URI not found in .env. MongoDB connection will be skipped.'
  );
}

// --- Routes ---
// All routes defined in authRoutes will be prefixed with /api/auth
app.use ('/api/auth', authRoutes);
// All routes defined in audioItemRoutes will be prefixed with /api/items
app.use ('/api/items', audioItemRoutes);

// Basic test route
app.get ('/', (req, res) => {
  res.send ('Vintage Audio Vault Backend is running!');
});

// ... other routes and global error handling middleware could go here

// Start the server
app.listen (PORT, () => {
  console.log (`Server running on port ${PORT}`);
  console.log (`Access backend at http://localhost:${PORT}`);
});
