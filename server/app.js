// server/app.js
require ('dotenv').config ({path: '../.env'}); // Load environment variables from the root .env file

const express = require ('express');
const mongoose = require ('mongoose');
const cors = require ('cors');
const {Storage} = require ('@google-cloud/storage');
const {GoogleGenerativeAI} = require ('@google/generative-ai');
const cron = require ('node-cron'); // <-- NEW: Import node-cron
const axios = require ('axios'); // <-- NEW: Import axios

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

// --- UPDATED: Google Cloud Storage Initialization for Production & Development ---
const gcsBucketName = process.env.GCS_BUCKET_NAME;
const gcpProjectId = process.env.GCP_PROJECT_ID;
const gcpClientEmail = process.env.GCP_CLIENT_EMAIL;
const gcpPrivateKey = process.env.GCP_PRIVATE_KEY;
const serviceAccountKeyPath = process.env.GCP_KEY_PATH; // For local dev

let storage;

if (gcpClientEmail && gcpPrivateKey && gcpProjectId) {
  // --- Production Logic (uses direct credential values) ---
  console.log (
    'Initializing GCS with environment variables (Production Mode).'
  );
  try {
    const credentials = {
      client_email: gcpClientEmail,
      private_key: gcpPrivateKey.replace (/\\n/g, '\n'), // Formats the private key correctly
    };
    storage = new Storage ({
      projectId: gcpProjectId,
      credentials,
    });
  } catch (error) {
    console.error (
      'Failed to initialize Google Cloud Storage with environment variables:',
      error
    );
  }
} else if (serviceAccountKeyPath) {
  // --- Development Logic (uses a local key file) ---
  console.log ('Initializing GCS with key file (Development Mode).');
  try {
    storage = new Storage ({keyFilename: serviceAccountKeyPath});
  } catch (error) {
    console.error (
      'Failed to initialize Google Cloud Storage with key file:',
      error
    );
  }
}

if (storage && gcsBucketName) {
  app.locals.gcs = {storage: storage, bucketName: gcsBucketName};
  console.log ('Google Cloud Storage context set successfully.');
} else {
  console.warn (
    'GCS initialization skipped: Required configuration is missing.'
  );
}
// --- END OF GCS UPDATE ---

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

/**
 * @route   GET /api/health-check
 * @desc    A lightweight endpoint for keep-alive services.
 * @access  Public
 */
app.get ('/api/health-check', (req, res) => {
  // Simply respond with a success status and a message.
  // This requires no database calls or heavy processing.
  res
    .status (200)
    .json ({status: 'UP', message: 'Server is awake and running.'});
});

// --- NEW: Self-Ping Cron Job to Prevent Sleep ---
const selfPingUrl = 'https://vintage-audio-vault.onrender.com/api/health-check';

// Schedule a task to run every 14 minutes.
// This is to prevent the free Render service from spinning down due to inactivity.
cron.schedule ('*/14 * * * *', () => {
  console.log ('CRON JOB: Pinging self to prevent sleep...');
  axios
    .get (selfPingUrl)
    .then (response => {
      console.log (
        `CRON JOB: Ping successful. Status: ${response.data.status}`
      );
    })
    .catch (error => {
      // Log the error but don't crash the server.
      // This could happen for various reasons (e.g., network issues, URL change).
      console.error (
        'CRON JOB: Self-ping failed.',
        error.response ? error.response.data : error.message
      );
    });
});
// --- END of Self-Ping Cron Job ---

// Start the server
app.listen (PORT, () => {
  console.log (`Server running on port ${PORT}`);
  console.log (`Access backend at http://localhost:${PORT}`);
});

module.exports = app;
