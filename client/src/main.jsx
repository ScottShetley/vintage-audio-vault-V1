// client/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios'; // <-- Import axios

// Import AppWrapper, NOT App
import AppWrapper from './App.jsx';

import './index.css';

// --- NEW: Axios Configuration for Production/Development ---
// This checks if the app is in production and sets the base API URL accordingly.
if (import.meta.env.PROD) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}
// In development (npm run dev), Vite's proxy in vite.config.js will handle requests.
// -----------------------------------------------------------

ReactDOM.createRoot (document.getElementById ('root')).render (
  <React.StrictMode>
    {/* Render AppWrapper here */}
    <AppWrapper />
  </React.StrictMode>
);