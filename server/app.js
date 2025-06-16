// c:\Users\david\Desktop\projects\vintageaudiovault\server\app.js
require ('dotenv').config ({path: '../.env'}); // Load environment variables from the root .env file

// It's good practice to import all necessary modules at the top
const express = require ('express');
const mongoose = require ('mongoose');
const cors = require ('cors');
const {Storage} = require ('@google-cloud/storage'); // Import Google Cloud Storage
const {GoogleGenerativeAI} = require ('@google/generative-ai'); // Import Gemini AI SDK

const authRoutes = require ('./routes/authRoutes'); // Import authentication routes
const audioItemRoutes = require ('./routes/audioItemRoutes'); // Import audio item routes
console.log (
  'DEBUG: Type of audioItemRoutes after require:',
  typeof audioItemRoutes
); // DEBUG LOG

const app = express ();
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000

app.use (express.json ());
app.use (cors ());

// --- Global Request Logger (add this early) ---
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

// --- Google Cloud Storage Initialization ---
const serviceAccountKeyPath = process.env.GCP_KEY_PATH;
const gcsBucketName = process.env.GCS_BUCKET_NAME;

if (serviceAccountKeyPath && gcsBucketName) {
  console.log ('--- Debugging GCS Key Path & Bucket ---');
  console.log ('Path read from .env for GCS Key:', serviceAccountKeyPath);
  console.log ('Bucket Name read from .env for GCS:', gcsBucketName);
  try {
    const fs = require ('fs');
    console.log (
      'Does key file exist at this path?',
      fs.existsSync (serviceAccountKeyPath)
    );
    if (!fs.existsSync (serviceAccountKeyPath)) {
      console.error (
        'ERROR: GCS service account key file not found at the specified path!'
      );
    }
  } catch (err) {
    console.error ('Error checking key file existence:', err);
  }
  console.log ('-------------------------------------');

  try {
    const storage = new Storage ({
      keyFilename: serviceAccountKeyPath,
    });
    app.locals.gcs = {
      storage: storage,
      bucketName: gcsBucketName,
    };
    console.log ('Google Cloud Storage initialized successfully.');
  } catch (error) {
    console.error ('Failed to initialize Google Cloud Storage:', error);
  }
} else {
  if (!serviceAccountKeyPath) {
    console.warn (
      'GCP_KEY_PATH not found in .env. Google Cloud Storage will not be initialized.'
    );
  }
  if (!gcsBucketName) {
    console.warn (
      'GCS_BUCKET_NAME not found in .env. Google Cloud Storage might not function correctly without it.'
    );
  }
  if (!serviceAccountKeyPath || !gcsBucketName) {
    console.warn (
      'Google Cloud Storage initialization skipped due to missing .env variables.'
    );
  }
}

// --- Google Gemini AI Initialization ---
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
    'GEMINI_API_KEY not found in .env. Google Gemini AI SDK will not be initialized.'
  );
}

// --- VERY SIMPLE GLOBAL TEST ROUTE (BEFORE OTHER API ROUTES) ---
app.get ('/global-test', (req, res) => {
  console.log ('--- Global test route /global-test was hit! ---');
  res.status (200).json ({message: 'Global test route is working!'});
});

// --- Routes ---
app.use ('/api/auth', authRoutes); // Ensure this line is UNCOMMENTED
console.log ('DEBUG: Mounting /api/items router.');
app.use ('/api/items', audioItemRoutes);

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
