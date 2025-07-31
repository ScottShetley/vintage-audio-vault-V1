// server/app.js
require ('dotenv').config ({path: '../.env'}); // Load environment variables from the root .env file

const express = require ('express');
const mongoose = require ('mongoose');
const cors = require ('cors');
const {Storage} = require ('@google-cloud/storage');
const {GoogleGenerativeAI} = require ('@google/generative-ai');

const authRoutes = require ('./routes/authRoutes');
const audioItemRoutes = require ('./routes/audioItemRoutes');
const wildFindRoutes = require ('./routes/wildFindRoutes');
const userRoutes = require ('./routes/userRoutes');

const app = express ();
const PORT = process.env.PORT || 5000;

// --- FINAL: CORS Configuration for Production ---
const allowedOrigins = [
  'http://localhost:5173',
  'https://vintage-audio-vault.onrender.com',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback (null, true);

    // Check if the origin is in our list
    if (allowedOrigins.indexOf (origin) !== -1) {
      return callback (null, true);
    }

    // If not in the list, block the request
    return callback (
      new Error (
        'The CORS policy for this site does not allow access from the specified Origin.'
      )
    );
  },
  credentials: true,
};

app.use (cors (corsOptions));
// --- End of CORS Configuration ---

app.use (express.json ());

app.use ((req, res, next) => {
  console.log (
    `GLOBAL LOGGER: Incoming ${req.method} request to ${req.originalUrl}`
  );
  next ();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose
    .connect (MONGODB_URI)
    .then (() => console.log ('MongoDB connected successfully!'))
    .catch (err => {
      console.error ('MongoDB connection error:', err);
    });
} else {
  console.warn (
    'MONGODB_URI not found in .env. MongoDB connection will be skipped.'
  );
}

// Google Cloud Storage Initialization
const serviceAccountKeyPath = process.env.GCP_KEY_PATH;
const gcsBucketName = process.env.GCS_BUCKET_NAME;
if (serviceAccountKeyPath && gcsBucketName) {
  try {
    const storage = new Storage ({keyFilename: serviceAccountKeyPath});
    app.locals.gcs = {storage: storage, bucketName: gcsBucketName};
    console.log ('Google Cloud Storage initialized successfully.');
  } catch (error) {
    console.error ('Failed to initialize Google Cloud Storage:', error);
  }
} else {
  console.warn ('GCS initialization skipped due to missing .env variables.');
}

// Google Gemini AI Initialization
const geminiApiKey = process.env.GEMINI_API_KEY;
if (geminiApiKey) {
  try {
    const genAI = new GoogleGenerativeAI (geminiApiKey);
    app.locals.gemini = genAI;
    console.log ('Google Gemini AI SDK initialized successfully.');
  } catch (error) {
    console.error ('Failed to initialize Google Gemini AI SDK:', error);
  }
} else {
  console.warn (
    'GEMINI_API_KEY not found in .env. SDK will not be initialized.'
  );
}

// --- Routes ---
app.use ('/api/auth', authRoutes);
app.use ('/api/items', audioItemRoutes);
app.use ('/api/wild-finds', wildFindRoutes);
app.use ('/api/users', userRoutes);

// Basic test route
app.get ('/', (req, res) => {
  res.send ('Vintage Audio Vault Backend is running!');
});

// Start the server
app.listen (PORT, () => {
  console.log (`Server running on port ${PORT}`);
  console.log (`Access backend at http://localhost:${PORT}`);
});

module.exports = app;
