// client/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { BrowserRouter as Router } from 'react-router-dom'; // Import Router
import { AuthProvider } from './contexts/AuthContext'; // Import our new AuthProvider

import App from './App.jsx'; // Import App directly, NOT AppWrapper
import './index.css';

// --- Axios Configuration for Production/Development ---
if (import.meta.env.PROD) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}
// In development (npm run dev), Vite's proxy in vite.config.js will handle requests.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);